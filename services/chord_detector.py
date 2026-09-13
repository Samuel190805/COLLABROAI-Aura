import sys
import json
import math
import numpy as np
import scipy.ndimage
import librosa

CHROMATIC_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

CHORD_TEMPLATES = {
    "maj":  [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
    "min":  [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
    "7":    [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    "maj7": [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1],
    "min7": [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
    "dim":  [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
    "dim7": [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
    "aug":  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    "sus2": [1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    "sus4": [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
}

QUALITY_SUFFIX_MAP = {
    "maj": "",
    "min": "m",
    "7": "7",
    "maj7": "maj7",
    "min7": "m7",
    "dim": "dim",
    "dim7": "dim7",
    "aug": "aug",
    "sus2": "sus2",
    "sus4": "sus4",
}

# Major & Minor Key Profiles (Krumhansl-Schmuckler)
MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

CAMELOT_MAJOR = {
    "C": "8B", "C#": "3B", "D": "10B", "D#": "5B", "E": "12B", "F": "7B",
    "F#": "2B", "G": "9B", "G#": "4B", "A": "11B", "A#": "6B", "B": "1B"
}
CAMELOT_MINOR = {
    "C": "5A", "C#": "12A", "D": "7A", "D#": "2A", "E": "9A", "F": "4A",
    "F#": "11A", "G": "6A", "G#": "1A", "A": "8A", "A#": "3A", "B": "10A"
}

def precompute_templates():
    templates = []
    for r_idx, root_note in enumerate(CHROMATIC_NOTES):
        for quality, base_vec in CHORD_TEMPLATES.items():
            rolled = np.roll(base_vec, r_idx).astype(float)
            norm = np.linalg.norm(rolled)
            if norm > 0:
                rolled /= norm
            templates.append({
                "root": root_note,
                "root_idx": r_idx,
                "quality": quality,
                "name": f"{root_note}{QUALITY_SUFFIX_MAP[quality]}",
                "vec": rolled,
            })
    return templates

ALL_TEMPLATES = precompute_templates()

def detect_key_and_camelot(global_chroma):
    best_corr = -999.0
    best_key = "C Major"
    best_camelot = "8B"

    norm = np.linalg.norm(global_chroma)
    c = global_chroma / norm if norm > 0 else global_chroma

    maj_p = np.array(MAJOR_PROFILE) / np.linalg.norm(MAJOR_PROFILE)
    min_p = np.array(MINOR_PROFILE) / np.linalg.norm(MINOR_PROFILE)

    for r_idx, root in enumerate(CHROMATIC_NOTES):
        rot_maj = np.roll(maj_p, r_idx)
        corr_maj = np.dot(c, rot_maj)
        if corr_maj > best_corr:
            best_corr = corr_maj
            best_key = f"{root} Major"
            best_camelot = CAMELOT_MAJOR.get(root, "8B")

        rot_min = np.roll(min_p, r_idx)
        corr_min = np.dot(c, rot_min)
        if corr_min > best_corr:
            best_corr = corr_min
            best_key = f"{root} Minor"
            best_camelot = CAMELOT_MINOR.get(root, "8A")

    return best_key, best_camelot

def segment_song_structure(y, sr, total_duration, beat_times):
    """
    Section B.2: Structural segmentation pass using agglomerative clustering
    over joint MFCC and Chroma features to detect musical sections.
    """
    if total_duration < 15.0 or len(beat_times) < 8:
        return [{"label": "Verse", "startSec": 0.0, "endSec": round(total_duration, 2)}]

    k = min(7, max(3, int(total_duration / 28.0)))

    try:
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr, n_chroma=12)
        features = np.vstack([mfcc, chroma])
        features = scipy.ndimage.median_filter(features, size=(1, 9))

        bounds_frames = librosa.segment.agglomerative(features, k=k)
        bound_times = librosa.frames_to_time(bounds_frames, sr=sr).tolist()
        bound_times = sorted(list(set([0.0] + [round(t, 2) for t in bound_times if 0 < t < total_duration] + [round(total_duration, 2)])))
    except Exception:
        # Fallback to evenly spaced musical sections
        step = total_duration / k
        bound_times = [round(i * step, 2) for i in range(k)] + [round(total_duration, 2)]

    sections = []
    macro_labels = ["Intro", "Verse 1", "Chorus 1", "Verse 2", "Chorus 2", "Bridge", "Outro"]

    for i in range(len(bound_times) - 1):
        s_start = bound_times[i]
        s_end = bound_times[i + 1]
        label = macro_labels[i] if i < len(macro_labels) else f"Part {i + 1}"
        if i == len(bound_times) - 2 and len(bound_times) > 3:
            label = "Outro"
        sections.append({
            "label": label,
            "startSec": s_start,
            "endSec": s_end
        })

    return sections

def viterbi_chord_decode(beat_chroma, all_templates, stay_prob=0.75):
    """
    HMM Viterbi decoding over beat-synchronous chroma vectors to ensure stable chord
    boundaries and suppress rapid frame-level jitter.
    """
    num_beats = beat_chroma.shape[1]
    num_templates = len(all_templates)

    template_matrix = np.array([t["vec"] for t in all_templates])  # [num_templates, 12]

    # Normalize beat chroma
    norms = np.linalg.norm(beat_chroma, axis=0, keepdims=True)
    norms[norms == 0] = 1e-6
    norm_chroma = beat_chroma / norms  # [12, num_beats]

    # Dot product emissions [num_templates, num_beats]
    emissions = np.dot(template_matrix, norm_chroma)
    # Clip and convert to log probabilities
    emissions = np.maximum(emissions, 1e-4)
    log_emissions = np.log(emissions)

    # Transition matrix log probabilities
    # High probability to stay on same chord, lower to change
    log_stay = np.log(stay_prob)
    log_change = np.log((1.0 - stay_prob) / (num_templates - 1))

    # Dynamic programming matrices
    V = np.zeros((num_templates, num_beats))
    ptr = np.zeros((num_templates, num_beats), dtype=int)

    V[:, 0] = log_emissions[:, 0]

    for t in range(1, num_beats):
        prev_v = V[:, t - 1]
        best_prev = np.argmax(prev_v)
        best_prev_val = prev_v[best_prev]

        for s in range(num_templates):
            # Candidate 1: staying from same state s
            score_stay = prev_v[s] + log_stay
            # Candidate 2: changing from best other state
            score_change = best_prev_val + log_change
            if score_stay >= score_change:
                V[s, t] = score_stay + log_emissions[s, t]
                ptr[s, t] = s
            else:
                V[s, t] = score_change + log_emissions[s, t]
                ptr[s, t] = best_prev

    # Backtrack best path
    best_path = [int(np.argmax(V[:, num_beats - 1]))]
    for t in range(num_beats - 1, 0, -1):
        best_path.append(ptr[best_path[-1], t])
    best_path.reverse()

    confidences = [float(emissions[best_path[t], t]) for t in range(num_beats)]
    return best_path, confidences

def analyze_chords(audio_path):
    # 1. Load audio with librosa at 22050Hz mono
    y, sr = librosa.load(audio_path, sr=22050, mono=True)
    total_duration = float(librosa.get_duration(y=y, sr=sr))

    # 2. Beat Tracking
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    if isinstance(tempo, np.ndarray):
        bpm = float(tempo[0]) if len(tempo) > 0 else 120.0
    else:
        bpm = float(tempo) if tempo > 0 else 120.0
    bpm = round(bpm)

    # 3. Harmonic Constant-Q Transform Chromagram
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, n_chroma=12)

    # Global chroma for key detection
    global_chroma = np.mean(chroma, axis=1)
    detected_key, camelot_key = detect_key_and_camelot(global_chroma)

    # Low-frequency Bass Chromagram for Slash/Inversion Detection (Section B.1)
    bass_chroma = librosa.feature.chroma_cqt(
        y=y, sr=sr, fmin=float(librosa.note_to_hz('C1')), n_octaves=2, n_chroma=12
    )

    # 4. Beat-synchronous Chroma Aggregation
    if len(beat_frames) > 1:
        beat_chroma = librosa.util.sync(chroma, beat_frames, aggregate=np.median)
        beat_bass = librosa.util.sync(bass_chroma, beat_frames, aggregate=np.median)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)
    else:
        hop_length = sr
        num_windows = max(1, int(len(y) / hop_length))
        frame_indices = np.linspace(0, chroma.shape[1] - 1, num_windows).astype(int)
        beat_chroma = librosa.util.sync(chroma, frame_indices, aggregate=np.median)
        beat_bass = librosa.util.sync(bass_chroma, frame_indices, aggregate=np.median)
        beat_times = np.linspace(0, total_duration, num_windows)

    num_beats = beat_chroma.shape[1]

    # 5. Structural Song Segmentation (Section B.2: Intro, Verse, Chorus, Bridge, Outro)
    sections = segment_song_structure(y, sr, total_duration, beat_times)

    def get_section_label(time_sec):
        for sec in sections:
            if sec["startSec"] <= time_sec <= sec["endSec"]:
                return sec["label"]
        return sections[0]["label"] if sections else "Verse"

    # 6. ML / HMM Viterbi Chord Decoding (Section B.1)
    best_template_indices, best_confidences = viterbi_chord_decode(beat_chroma, ALL_TEMPLATES)

    # 7. Generate Frame Segments with Bass Note / Slash Inversion Detection
    CONFIDENCE_THRESHOLD = 0.40
    segments = []
    detected_vocab_set = set()

    for b in range(num_beats):
        start_sec = round(float(beat_times[b]), 2)
        end_sec = round(float(beat_times[b + 1]) if b + 1 < len(beat_times) else total_duration, 2)
        if end_sec <= start_sec:
            end_sec = round(start_sec + (60.0 / max(60, bpm)), 2)

        t_idx = int(best_template_indices[b])
        conf = round(float(best_confidences[b]), 2)
        sec_label = get_section_label(start_sec)

        if conf < CONFIDENCE_THRESHOLD:
            chord_name = "N.C."
            root_name = "C"
            quality = "nc"
            bass_note = None
        else:
            t = ALL_TEMPLATES[t_idx]
            root_name = t["root"]
            quality = t["quality"]
            detected_vocab_set.add(quality)

            # Check bass chromagram for distinct bass note inversion (Section B.1)
            bass_vec = beat_bass[:, b]
            sum_bass = np.sum(bass_vec)
            bass_idx = int(np.argmax(bass_vec))
            dominant_bass = CHROMATIC_NOTES[bass_idx]

            # If strong bass presence differs from chord root, emit slash chord
            if sum_bass > 0 and (bass_vec[bass_idx] / sum_bass) > 0.28 and dominant_bass != root_name:
                chord_name = f"{root_name}{QUALITY_SUFFIX_MAP[quality]}/{dominant_bass}"
                bass_note = dominant_bass
            else:
                chord_name = t["name"]
                bass_note = None

        segments.append({
            "startSec": start_sec,
            "endSec": end_sec,
            "timestamp": start_sec,
            "chord": chord_name,
            "root": root_name,
            "quality": quality,
            "bassNote": bass_note,
            "confidence": conf,
            "sectionLabel": sec_label,
            "durationSeconds": round(end_sec - start_sec, 2),
        })

    # Consolidate consecutive identical chords into smooth timeline events
    consolidated = []
    if segments:
        curr = segments[0]
        for s in segments[1:]:
            if s["chord"] == curr["chord"] and s["sectionLabel"] == curr["sectionLabel"]:
                curr["endSec"] = s["endSec"]
                curr["durationSeconds"] = round(curr["endSec"] - curr["startSec"], 2)
                curr["confidence"] = round(max(curr["confidence"], s["confidence"]), 2)
            else:
                consolidated.append(curr)
                curr = s
        consolidated.append(curr)

    # Calculate recommended capo (Section B.4)
    root_match = detected_key.replace(" Major", "").replace(" Minor", "").strip()
    capo = 0
    easy_keys = ["G", "C", "D", "E", "A"]
    if root_match in CHROMATIC_NOTES:
        r_i = CHROMATIC_NOTES.index(root_match)
        for f in range(1, 6):
            cand = CHROMATIC_NOTES[(r_i - f + 12) % 12]
            if cand in easy_keys:
                capo = f
                break

    detected_vocab = sorted(list(detected_vocab_set))
    if not detected_vocab:
        detected_vocab = ["maj", "min"]

    return {
        "detectedKey": detected_key,
        "originalKey": detected_key,
        "camelotKey": camelot_key,
        "recommendedCapo": capo,
        "bpm": bpm,
        "sections": sections,
        "detectedVocabulary": detected_vocab,
        "chords": consolidated,
        "chordTimeline": consolidated,
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input file provided"}))
        sys.exit(1)

    input_file = sys.argv[1]
    try:
        res = analyze_chords(input_file)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
