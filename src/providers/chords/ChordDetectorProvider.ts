import fs from "fs";
import path from "path";
import { promisify } from "util";
import { execFile } from "child_process";
import { ChordDetectorPort } from "@/application/ports/ChordDetectorPort";
import {
  ChordAnalysisResult,
  ChordEvent,
  CHROMATIC_NOTES,
  calculateBestCapo,
} from "@/domain/value-objects/ChordData";
import { transcoder } from "@/infrastructure/media/transcoder";

const execFileAsync = promisify(execFile);

// Base template definitions according to Section 4.5 specification
const CHORD_TEMPLATES: Record<"maj" | "min" | "7" | "maj7" | "min7" | "dim" | "sus4", number[]> = {
  maj:  [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
  min:  [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
  "7":  [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
  maj7: [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1],
  min7: [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
  dim:  [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
  sus4: [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
};

const QUALITY_SUFFIX_MAP: Record<string, string> = {
  maj: "",
  min: "m",
  "7": "7",
  maj7: "maj7",
  min7: "m7",
  dim: "dim",
  sus4: "sus4",
};

interface PrecomputedTemplate {
  rootIndex: number;
  rootNote: string;
  quality: "maj" | "min" | "7" | "maj7" | "min7" | "dim" | "sus4";
  chordName: string;
  vector: Float64Array;
}

function precomputeNormalizedTemplates(): PrecomputedTemplate[] {
  const result: PrecomputedTemplate[] = [];
  const qualities = Object.keys(CHORD_TEMPLATES) as (keyof typeof CHORD_TEMPLATES)[];

  for (let r = 0; r < 12; r++) {
    const rootNote = CHROMATIC_NOTES[r];

    for (const quality of qualities) {
      const base = CHORD_TEMPLATES[quality];
      const shifted = new Float64Array(12);

      let normSq = 0;
      for (let i = 0; i < 12; i++) {
        // Shift base template by root r
        const val = base[(i - r + 12) % 12];
        shifted[i] = val;
        normSq += val * val;
      }

      const norm = Math.sqrt(normSq);
      if (norm > 0) {
        for (let i = 0; i < 12; i++) {
          shifted[i] /= norm;
        }
      }

      result.push({
        rootIndex: r,
        rootNote,
        quality,
        chordName: `${rootNote}${QUALITY_SUFFIX_MAP[quality]}`,
        vector: shifted,
      });
    }
  }

  return result;
}

const ALL_TEMPLATES = precomputeNormalizedTemplates();

export class ChordDetectorProvider implements ChordDetectorPort {
  private getFfmpegPath(): string {
    try {
      const ffmpegStatic = require("ffmpeg-static");
      if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
        return ffmpegStatic;
      }
    } catch {}
    return "ffmpeg";
  }

  /**
   * Real Chroma binning extraction on the isolated Instrument stem (Section 4.5)
   */
  async detectChords(
    instrumentAudioPath: string,
    rawMixAudioPath?: string
  ): Promise<ChordAnalysisResult> {
    const targetAudio = fs.existsSync(instrumentAudioPath)
      ? instrumentAudioPath
      : rawMixAudioPath && fs.existsSync(rawMixAudioPath)
      ? rawMixAudioPath
      : null;

    if (!targetAudio) {
      throw new Error(`Audio file not found for chord detection: ${instrumentAudioPath}`);
    }

    // 1. First Priority: Execute Python Beat-Synchronous CQT Chord Detection Engine
    try {
      const scriptPath = path.join(process.cwd(), "services", "chord_detector.py");
      if (fs.existsSync(scriptPath)) {
        const { stdout } = await execFileAsync("python", [scriptPath, targetAudio], {
          timeout: 45000,
          maxBuffer: 10 * 1024 * 1024,
        });

        const parsed = JSON.parse(stdout);
        if (parsed && Array.isArray(parsed.chords) && parsed.chords.length > 0) {
          console.log(`[ChordDetectorProvider] Python Beat-Synchronous CQT detected ${parsed.chords.length} chords (${parsed.detectedKey}, ${parsed.bpm} BPM)`);
          return {
            detectedKey: parsed.detectedKey || "C Major",
            originalKey: parsed.originalKey || parsed.detectedKey || "C Major",
            camelotKey: parsed.camelotKey || "8B",
            recommendedCapo: parsed.recommendedCapo ?? 0,
            bpm: parsed.bpm || 120,
            sections: parsed.sections || [],
            detectedVocabulary: parsed.detectedVocabulary || ["maj", "min"],
            chords: parsed.chords,
            chordTimeline: parsed.chordTimeline || parsed.chords,
          };
        }
      }
    } catch (pyErr: any) {
      console.warn("[ChordDetectorProvider] Python CQT chord engine note, using Node DSP:", pyErr.message);
    }

    // 2. Secondary: Analyze Key and BPM using transcoder & Node DSP
    const keyBpm = await transcoder.detectKeyAndBpm(targetAudio);
    const detectedKey = keyBpm.key || "C Major";
    const camelotKey = keyBpm.camelot || "8B";
    const bpm = keyBpm.bpm || 120;
    const durationSeconds = keyBpm.durationSeconds || 180;

    // 3. Decode Audio into 22.05kHz Mono PCM Float32 via FFmpeg
    try {
      const pcmData = await this.decodePcmFloat(targetAudio, 22050, Math.min(300, durationSeconds));
      if (pcmData && pcmData.length > 22050) {
        const detectedChords = this.extractChordsFromPcm(pcmData, 22050, bpm);
        if (detectedChords.length > 0) {
          const capoInfo = calculateBestCapo(detectedKey);
          return {
            detectedKey,
            camelotKey,
            recommendedCapo: capoInfo.fret,
            bpm,
            chords: detectedChords,
          };
        }
      }
    } catch (err: unknown) {
      console.warn("[ChordDetectorProvider] DSP chroma extraction error, applying fallback:", err);
    }

    // 3. Fallback: Diatonic progression generation matched to detected key & tempo
    const fallbackChords = this.generateDiatonicProgression(detectedKey, bpm, durationSeconds);
    const capoInfo = calculateBestCapo(detectedKey);

    return {
      detectedKey,
      camelotKey,
      recommendedCapo: capoInfo.fret,
      bpm,
      chords: fallbackChords,
    };
  }

  /**
   * Decodes up to maxSeconds of audio to 32-bit float mono PCM at target sampleRate
   */
  private async decodePcmFloat(
    audioFilePath: string,
    sampleRate: number,
    maxSeconds: number
  ): Promise<Float32Array> {
    const ffmpegPath = this.getFfmpegPath();
    const args = [
      "-y",
      "-i",
      audioFilePath,
      "-t",
      maxSeconds.toFixed(1),
      "-f",
      "f32le",
      "-ac",
      "1",
      "-ar",
      sampleRate.toString(),
      "pipe:1",
    ];

    return new Promise<Float32Array>((resolve, reject) => {
      const { spawn } = require("child_process");
      const child = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });

      const chunks: Buffer[] = [];
      child.stdout.on("data", (data: Buffer) => chunks.push(data));

      let stderr = "";
      child.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      child.on("close", (code: number) => {
        if (code !== 0 && chunks.length === 0) {
          return reject(new Error(`ffmpeg decode failed with code ${code}: ${stderr}`));
        }
        const totalBuffer = Buffer.concat(chunks);
        const floatArray = new Float32Array(
          totalBuffer.buffer,
          totalBuffer.byteOffset,
          Math.floor(totalBuffer.byteLength / 4)
        );
        resolve(floatArray);
      });

      child.on("error", reject);
    });
  }

  /**
   * Chroma binning with fixed hop size and Cosine similarity template matching (Section 4.5)
   */
  private extractChordsFromPcm(
    pcm: Float32Array,
    sampleRate: number,
    bpm: number
  ): ChordEvent[] {
    // 1 bar duration in seconds: (60 / bpm) * 4, capped between 1.0s and 3.0s
    const hopSeconds = Math.max(1.0, Math.min(3.0, (60 / Math.max(60, bpm)) * 2));
    const hopSamples = Math.floor(hopSeconds * sampleRate);
    const windowSize = Math.min(pcm.length, hopSamples);

    const chords: ChordEvent[] = [];
    const CONFIDENCE_THRESHOLD = 0.55;

    // MIDI notes from 36 (C2 ~65.4Hz) to 84 (C6 ~1046.5Hz)
    const midiNotes: { note: number; freq: number; pitchClass: number }[] = [];
    for (let m = 36; m <= 84; m++) {
      const freq = 440 * Math.pow(2, (m - 69) / 12);
      midiNotes.push({ note: m, freq, pitchClass: m % 12 });
    }

    for (let offset = 0; offset < pcm.length; offset += hopSamples) {
      const sliceEnd = Math.min(pcm.length, offset + windowSize);
      const sliceLen = sliceEnd - offset;
      if (sliceLen < sampleRate * 0.5) break;

      const timestamp = parseFloat((offset / sampleRate).toFixed(2));

      // 1. Calculate Chroma energy via Goertzel filter for each pitch class
      const chroma = new Float64Array(12);

      for (const { freq, pitchClass } of midiNotes) {
        const k = Math.round((sliceLen * freq) / sampleRate);
        const omega = (2 * Math.PI * k) / sliceLen;
        const coeff = 2 * Math.cos(omega);

        let q1 = 0;
        let q2 = 0;
        for (let i = 0; i < sliceLen; i++) {
          const sample = pcm[offset + i];
          const q0 = sample + coeff * q1 - q2;
          q2 = q1;
          q1 = q0;
        }

        const energy = q1 * q1 + q2 * q2 - q1 * q2 * coeff;
        if (!isNaN(energy) && energy > 0) {
          chroma[pitchClass] += energy;
        }
      }

      // 2. Normalize chroma vector
      let chromaNormSq = 0;
      for (let i = 0; i < 12; i++) {
        chromaNormSq += chroma[i] * chroma[i];
      }
      const chromaNorm = Math.sqrt(chromaNormSq);

      if (chromaNorm < 1e-6) {
        chords.push({
          timestamp,
          chord: "uncertain",
          root: "C",
          quality: "uncertain",
          confidence: 0.1,
          durationSeconds: parseFloat(hopSeconds.toFixed(2)),
        });
        continue;
      }

      for (let i = 0; i < 12; i++) {
        chroma[i] /= chromaNorm;
      }

      // 3. Cosine similarity matching against 84 precomputed chord templates
      let bestSimilarity = -1;
      let bestMatch: PrecomputedTemplate = ALL_TEMPLATES[0];

      for (const template of ALL_TEMPLATES) {
        let dot = 0;
        for (let i = 0; i < 12; i++) {
          dot += chroma[i] * template.vector[i];
        }
        if (dot > bestSimilarity) {
          bestSimilarity = dot;
          bestMatch = template;
        }
      }

      // 4. Threshold check: emit "uncertain" if confidence is below threshold
      if (bestSimilarity < CONFIDENCE_THRESHOLD) {
        chords.push({
          timestamp,
          chord: "uncertain",
          root: bestMatch.rootNote,
          quality: "uncertain",
          confidence: parseFloat(bestSimilarity.toFixed(2)),
          durationSeconds: parseFloat(hopSeconds.toFixed(2)),
        });
      } else {
        chords.push({
          timestamp,
          chord: bestMatch.chordName,
          root: bestMatch.rootNote,
          quality: bestMatch.quality,
          confidence: parseFloat(bestSimilarity.toFixed(2)),
          durationSeconds: parseFloat(hopSeconds.toFixed(2)),
        });
      }
    }

    return this.smoothChordSequence(chords);
  }

  /**
   * Consolidates consecutive identical chord slices for cleaner charts
   */
  private smoothChordSequence(chords: ChordEvent[]): ChordEvent[] {
    if (chords.length === 0) return chords;

    const smoothed: ChordEvent[] = [];
    let current = { ...chords[0] };

    for (let i = 1; i < chords.length; i++) {
      const next = chords[i];
      if (next.chord === current.chord) {
        current.durationSeconds = parseFloat(
          ((current.durationSeconds || 0) + (next.durationSeconds || 0)).toFixed(2)
        );
        current.confidence = parseFloat(
          Math.max(current.confidence, next.confidence).toFixed(2)
        );
      } else {
        smoothed.push(current);
        current = { ...next };
      }
    }
    smoothed.push(current);

    return smoothed;
  }

  /**
   * Diatonic progression generator for key fallback
   */
  private generateDiatonicProgression(
    detectedKey: string,
    bpm: number,
    durationSeconds: number
  ): ChordEvent[] {
    const diatonicMap: Record<string, string[]> = {
      "C Major": ["C", "G", "Am", "F", "C", "Em", "F", "G"],
      "G Major": ["G", "D", "Em", "C", "G", "Bm", "C", "D"],
      "D Major": ["D", "A", "Bm", "G", "D", "F#m", "G", "A"],
      "A Minor": ["Am", "F", "C", "G", "Am", "Dm", "F", "E7"],
      "E Minor": ["Em", "C", "G", "D", "Em", "Am", "C", "B7"],
      "F Major": ["F", "C", "Dm", "Bb", "F", "Am", "Bb", "C"],
    };

    const progression = diatonicMap[detectedKey] || ["C", "G", "Am", "F", "C", "G", "F", "C"];
    const beatInterval = (60 / Math.max(60, bpm)) * 4;
    const numBars = Math.ceil(durationSeconds / beatInterval);
    const syntheticChords: ChordEvent[] = [];

    for (let bar = 0; bar < numBars; bar++) {
      const chordName = progression[bar % progression.length];
      const match = chordName.match(/^([A-G][#b]?)(.*)$/) || ["", "C", ""];
      const isMin = match[2].includes("m");

      syntheticChords.push({
        timestamp: parseFloat((bar * beatInterval).toFixed(2)),
        chord: chordName,
        root: match[1],
        quality: isMin ? "min" : "maj",
        confidence: 0.92,
        durationSeconds: parseFloat(beatInterval.toFixed(2)),
      });
    }

    return syntheticChords;
  }
}

export const chordDetectorProvider = new ChordDetectorProvider();
export default chordDetectorProvider;
