import sys
import os
import argparse
import numpy as np
import soundfile as sf
import librosa

def residual_refinement_mask(
    vocal_audio: np.ndarray,
    inst_audio: np.ndarray,
    sr: int,
    n_fft: int = 2048,
    hop_length: int = 512,
    mask_power: float = 1.2,
    eps: float = 1e-7,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Residual-subtraction cross-masking between isolated Vocals and Instrument stems.
    Computes time-frequency soft masks:
      Mask_vocal = |Vocal|^p / (|Vocal|^p + |Instrument|^p + eps)
      Mask_inst  = |Instrument|^p / (|Instrument|^p + |Vocal|^p + eps)
    Reconstructs each stem using its own original phase to avoid phase distortion.
    Supports mono (1D) and stereo (2D shape: [channels, samples]).
    """
    is_stereo = vocal_audio.ndim > 1 and vocal_audio.shape[0] == 2
    orig_length = vocal_audio.shape[-1]

    if is_stereo:
        ref_v = []
        ref_i = []
        for ch in range(2):
            v_ch, i_ch = _refine_channel(
                vocal_audio[ch], inst_audio[ch], n_fft, hop_length, mask_power, eps, orig_length
            )
            ref_v.append(v_ch)
            ref_i.append(i_ch)
        return np.stack(ref_v, axis=0), np.stack(ref_i, axis=0)
    else:
        v_mono = vocal_audio.flatten()
        i_mono = inst_audio.flatten()
        min_len = min(len(v_mono), len(i_mono))
        v_mono = v_mono[:min_len]
        i_mono = i_mono[:min_len]
        v_out, i_out = _refine_channel(
            v_mono, i_mono, n_fft, hop_length, mask_power, eps, min_len
        )
        return v_out, i_out

def _refine_channel(
    v_signal: np.ndarray,
    i_signal: np.ndarray,
    n_fft: int,
    hop_length: int,
    mask_power: float,
    eps: float,
    orig_length: int
) -> tuple[np.ndarray, np.ndarray]:
    # STFT on both channels
    stft_v = librosa.stft(v_signal, n_fft=n_fft, hop_length=hop_length)
    stft_i = librosa.stft(i_signal, n_fft=n_fft, hop_length=hop_length)

    mag_v = np.abs(stft_v)
    mag_i = np.abs(stft_i)

    # Wiener-like soft ratio masks with power weighting
    mag_v_pow = np.power(mag_v, mask_power)
    mag_i_pow = np.power(mag_i, mask_power)
    denominator = mag_v_pow + mag_i_pow + eps

    mask_vocal = mag_v_pow / denominator
    mask_inst = mag_i_pow / denominator

    # Refine complex spectrogram preserving each stem's original phase
    refined_stft_v = stft_v * mask_vocal
    refined_stft_i = stft_i * mask_inst

    # Inverse STFT
    v_rec = librosa.istft(refined_stft_v, hop_length=hop_length, length=orig_length)
    i_rec = librosa.istft(refined_stft_i, hop_length=hop_length, length=orig_length)

    return v_rec.astype(np.float32), i_rec.astype(np.float32)

def silence_activity_gating(
    vocal_audio: np.ndarray,
    sr: int,
    frame_ms: float = 20.0,
    min_silence_duration_ms: float = 300.0,
    db_threshold: float = -45.0,
    fade_ms: float = 15.0,
) -> np.ndarray:
    """
    Hard-gates dead sections in the vocal stem to true digital silence (0.0).
    Uses RMS energy across ~20ms frames. Contiguous silent regions >= min_silence_duration_ms
    are forced to zero with smooth 15ms cosine/linear cross-fades at boundaries to prevent clicks.
    """
    is_stereo = vocal_audio.ndim > 1 and vocal_audio.shape[0] == 2
    if is_stereo:
        # Mono mix for activity detection
        mono_signal = np.mean(vocal_audio, axis=0)
    else:
        mono_signal = vocal_audio.flatten()

    frame_length = int(sr * (frame_ms / 1000.0))
    hop_length = frame_length // 2
    fade_samples = max(1, int(sr * (fade_ms / 1000.0)))

    # Compute RMS energy per frame
    rms = librosa.feature.rms(y=mono_signal, frame_length=frame_length, hop_length=hop_length)[0]
    
    # Avoid log of 0
    ref_val = max(1e-5, np.max(rms))
    rms_db = 20.0 * np.log10(np.maximum(rms, 1e-7) / ref_val)

    # Frame-level active mask (True = active speech/singing, False = silence/dead)
    active_frames = rms_db > db_threshold

    # Time per hop
    min_silence_frames = int(min_silence_duration_ms / (1000.0 * hop_length / sr))

    # Identify contiguous inactive frame blocks >= min_silence_frames
    is_silent_frame = np.zeros(len(active_frames), dtype=bool)
    start_silent = None

    for i, active in enumerate(active_frames):
        if not active:
            if start_silent is None:
                start_silent = i
        else:
            if start_silent is not None:
                duration = i - start_silent
                if duration >= min_silence_frames:
                    is_silent_frame[start_silent:i] = True
                start_silent = None

    if start_silent is not None:
        duration = len(active_frames) - start_silent
        if duration >= min_silence_frames:
            is_silent_frame[start_silent:] = True

    # Build continuous sample-level gain mask [0.0 to 1.0]
    num_samples = vocal_audio.shape[-1]
    gain_mask = np.ones(num_samples, dtype=np.float32)

    # Interpolate frame silence to sample boundaries
    for i, silent in enumerate(is_silent_frame):
        if silent:
            sample_start = i * hop_length
            sample_end = min(num_samples, (i + 1) * hop_length)
            gain_mask[sample_start:sample_end] = 0.0

    # Smooth transitions (fade in / fade out) around gating edges
    diff = np.diff(gain_mask)
    falling_edges = np.where(diff < -0.5)[0]  # 1 -> 0
    rising_edges = np.where(diff > 0.5)[0]   # 0 -> 1

    for edge in falling_edges:
        start = max(0, edge - fade_samples)
        fade_len = edge - start + 1
        fade = np.linspace(1.0, 0.0, fade_len, dtype=np.float32)
        gain_mask[start:edge + 1] = np.minimum(gain_mask[start:edge + 1], fade)

    for edge in rising_edges:
        end = min(num_samples, edge + 1 + fade_samples)
        fade_len = end - (edge + 1)
        if fade_len > 0:
            fade = np.linspace(0.0, 1.0, fade_len, dtype=np.float32)
            gain_mask[edge + 1:end] = np.minimum(gain_mask[edge + 1:end], fade)

    # Apply gain mask
    if is_stereo:
        gated_vocal = vocal_audio * gain_mask[np.newaxis, :]
    else:
        gated_vocal = vocal_audio * gain_mask

    return gated_vocal.astype(np.float32)

def refine_stems_file(
    vocals_path: str,
    instrument_path: str,
    out_vocals_path: str = None,
    out_instrument_path: str = None,
) -> tuple[str, str]:
    """
    Executes Part A pipeline on files:
    1. Reads vocals and instrument audio
    2. Runs residual-subtraction refinement (Section A.3)
    3. Runs silence/activity gating on vocal stem (Section A.4)
    4. Writes back clean outputs
    """
    out_vocals = out_vocals_path or vocals_path
    out_inst = out_instrument_path or instrument_path

    # Read audio with soundfile
    v_data, v_sr = sf.read(vocals_path, dtype="float32")
    i_data, i_sr = sf.read(instrument_path, dtype="float32")

    # Align sample rates if different
    if v_sr != i_sr:
        i_data = librosa.resample(i_data.T if i_data.ndim > 1 else i_data, orig_sr=i_sr, target_sr=v_sr).T
        i_sr = v_sr

    sr = v_sr

    # Transpose soundfile (samples, channels) to (channels, samples) for processing
    if v_data.ndim > 1:
        v_audio = v_data.T
    else:
        v_audio = v_data

    if i_data.ndim > 1:
        i_audio = i_data.T
    else:
        i_audio = i_data

    # Truncate to matching length
    min_len = min(v_audio.shape[-1], i_audio.shape[-1])
    if v_audio.ndim > 1:
        v_audio = v_audio[:, :min_len]
        i_audio = i_audio[:, :min_len]
    else:
        v_audio = v_audio[:min_len]
        i_audio = i_audio[:min_len]

    # 1. Residual-subtraction refinement pass (Section A.3)
    ref_vocal, ref_inst = residual_refinement_mask(v_audio, i_audio, sr=sr)

    # 2. Silence/activity gating for dead sections on vocal stem only (Section A.4)
    gated_vocal = silence_activity_gating(ref_vocal, sr=sr)

    # Transpose back to (samples, channels) for soundfile saving
    save_vocal = gated_vocal.T if gated_vocal.ndim > 1 else gated_vocal
    save_inst = ref_inst.T if ref_inst.ndim > 1 else ref_inst

    # Save to disk
    sf.write(out_vocals, save_vocal, sr)
    sf.write(out_inst, save_inst, sr)

    return out_vocals, out_inst

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SplitStream Stem Refinement & Silence Gater")
    parser.add_argument("vocals_path", help="Path to raw vocals.wav")
    parser.add_argument("instrument_path", help="Path to raw instrument.wav")
    parser.add_argument("--out-vocals", default=None, help="Output path for refined vocals")
    parser.add_argument("--out-instrument", default=None, help="Output path for refined instrument")

    args = parser.parse_args()

    try:
        out_v, out_i = refine_stems_file(
            args.vocals_path,
            args.instrument_path,
            args.out_vocals,
            args.out_instrument,
        )
        print(f"[Refine] Successfully refined stems: {out_v}, {out_i}")
    except Exception as e:
        print(f"[Refine] Error refining stems: {e}", file=sys.stderr)
        sys.exit(1)
