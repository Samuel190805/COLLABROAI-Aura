# SplitStream — 2-Stem Audio & Video Media Suite

A precision web application for AI 2-stem source separation, lossless media extraction, speech translation, dual-track mashup creation, harmonic chord detection, and local-first playback.

Rebuilt from scratch with **Clean Architecture (Hexagonal / Ports & Adapters)**, a strict **Monolith Black & White Design System**, and a **2-stem separation model (`Vocals` & `Instrument` only)**.

---

## 1. Core Principles

1. **Monolith Black & White Design System**:
   - High-contrast typography (Inter display, JetBrains Mono code & metrics).
   - Hairline (1px) borders, zero glassmorphism, zero blur layers, zero neon gradients.
   - Text + moving hairline stage progression trackers.
   - Dual-channel vertical fader strips.
   - Pure monochrome with inverted accent states.

2. **Strict 2-Stem Separation Model**:
   - Audio is divided into exactly two stems: **`Vocals`** and **`Instrument`**.
   - No 4-stem or 6-stem categories anywhere in domain entities, database schemas, APIs, or UI.
   - Offline DSP fallback with center-channel phase cancellation and sub-bass preservation if the Python Demucs microservice is offline.

3. **Storage Discipline & Output Integrity**:
   - Intermediate files (unmixed WAVs, raw stream chunks) are deleted immediately upon job completion.
   - Output files are retained for 24 hours then automatically cleaned via hourly background sweep.
   - Real transcoding via FFmpeg verified with FFprobe stream inspection before delivery.

---

## 2. The 6 Tools

### 2.1 Vocal / Instrument Splitter (`/stems`)
- Isolates any uploaded file or remote URL into **`Vocals`** and **`Instrument`**.
- Powered by 2-stem Demucs v4 (FastAPI microservice) with DSP phase-cancellation fallback.
- Post-processing: 40Hz highpass on vocals, -60dB noise gate, EBU R128 loudness normalization.
- Interactive two-channel **StemMixer** with solo, mute, vertical volume faders, and pan sliders.
- Instant export: Individual MP3 downloads or ZIP archive bundle.

### 2.2 Link Downloader (`/download`)
- Server-side extraction and transcoding via `yt-dlp` from YouTube, SoundCloud, Bandcamp, and direct media URLs.
- Rich metadata inspection (title, author, duration, thumbnail) prior to download.
- Specific error diagnostics for age-restricted, private, and geo-blocked sources.
- Quick action handoffs to Stem Splitter, Mashup Studio, and Chord Detector.

### 2.3 Translate & Speak (`/translate`)
- End-to-end speech AI pipeline:
  1. **ASR (Speech-to-Text)**: 16kHz Whisper transcription with automatic source language detection.
  2. **Neural MT**: Contextual machine translation into 30+ supported languages.
  3. **Neural TTS**: Voice synthesis with voice preservation and multi-speaker diarization support.
- Editable bilingual transcription and translation cards.

### 2.4 Mashup Studio (`/mashup`)
- Dual-deck architecture (**Deck A** and **Deck B**) accepting local audio or remote URLs.
- Automated 2-stem isolation on both tracks.
- Key and BPM detection with harmonic compatibility scoring (Camelot wheel).
- 2-stem configuration: Vocals from Deck A + Instrument from Deck B, or vice-versa.
- Tempo-stretching (`atempo`) and pitch-shifting (`asetrate` / `rubberband`) with crossfader control.

### 2.5 Chord Detector & Practice Room (`/chords`)
- Runs pitch-class chroma binning exclusively on the isolated **Instrument** stem (eliminating vocal pitch interference).
- Cosine similarity matching against 84 precomputed chord templates (Major, Minor, 7, Maj7, Min7, Dim, Sus4) with confidence thresholding and `"uncertain"` emission.
- B&W interactive chord progression timeline synced with playback.
- Interactive Guitar fretboard, Piano keyboard, and Ukulele diagrams with smart capo calculation.
- Live microphone practice mode with real-time Web Audio pitch detection (< 100ms latency) and noise gate.

### 2.6 Local Player Suite (`/player`, `/audio-player`, `/video-player`)
- Pure client-side playback for local files and YouTube streams.
- IndexedDB playlist queue persisting across browser reloads.
- 10-band studio graphic equalizer (32Hz to 16kHz) with presets (Flat, Bass Boost, Vocal Boost, Acoustic, Electronic, Rock, Jazz).
- Line art turntable vinyl visualizer with 33 / 45 / 78 RPM playback.
- Dual-mode video player with Fullscreen, PiP, and voice presence clarity boost.

---

## 3. Architecture & Project Layout

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Login & Registration
│   ├── (main)/                   # Stems, Download, Translate, Mashup, Chords, Player, Status
│   └── api/                      # REST controllers & SSE endpoints
├── domain/                       # Hexagonal Domain Core
│   ├── entities/                 # User, Job, MediaAsset
│   ├── repositories/             # IJobRepository, IAssetRepository, IUserRepository
│   └── value-objects/            # StemKind, ChordData, MashupConfig, SupportedLanguages
├── application/                  # Use Cases & Application Ports
│   ├── ports/                    # SeparationProviderPort, ChordDetectorPort, etc.
│   └── use-cases/                # SeparateStemsUseCase, DetectChordsUseCase, CreateMashupUseCase, etc.
├── infrastructure/               # Frameworks & Adapters
│   ├── persistence/prisma/       # SQLite repositories
│   ├── queue/                    # Job queue with concurrency limits
│   ├── realtime/                 # SSE event bus
│   ├── storage/                  # RetentionManager (hourly cleanup, disk enforcement)
│   └── media/                    # FFmpeg transcoder & FFprobe validator
├── providers/                    # Service Implementations
│   ├── separation/               # SeparationClient (Demucs + DSP Fallback)
│   ├── chords/                   # ChordDetectorProvider (DSP Chroma + Cosine Matching)
│   ├── media-resolver/           # YtDlpMediaResolver
│   ├── asr/                      # WhisperASRProvider
│   ├── translation/              # NeuralTranslationProvider
│   └── tts/                      # NeuralTTSProvider
└── components/                   # Monolith B&W Design System
services/
└── separation-service/           # FastAPI Demucs 2-stem microservice
```

---

## 4. Setup & Local Development

### Prerequisites
- Node.js 18+ (tested on Node v24)
- Python 3.10+ (optional, for Demucs microservice)
- FFmpeg and FFprobe (bundled automatically via `ffmpeg-static` and `ffprobe-static`)

### Installation

1. Install Node.js dependencies:
```bash
npm install
```

2. Generate Prisma client & sync SQLite database:
```bash
npx prisma generate
npx prisma db push
```

3. Start the Next.js development server:
```bash
npm run dev
```

4. (Optional) Run Python Demucs microservice:
```bash
cd services/separation-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
*Note: If the microservice is offline, SplitStream automatically falls back to its built-in DSP phase cancellation engine.*

---

## 5. Health & Telemetry Endpoint

`GET /api/health` reports live system metrics:

```json
{
  "status": "ok",
  "disk": {
    "totalSpaceBytes": 509966483456,
    "freeSpaceBytes": 261758418944,
    "usedByAppBytes": 544697174,
    "percentUsed": 49
  },
  "queue": {
    "pendingJobs": 0,
    "activeJobs": 0,
    "completedJobs24h": 9,
    "failedJobs24h": 4
  },
  "stemsService": {
    "status": "online",
    "engine": "demucs",
    "gpuAvailable": false
  },
  "retention": {
    "lastSweepTimestamp": "2026-09-11T08:56:22.663Z",
    "filesDeletedLastSweep": 0,
    "bytesFreedLastSweep": 0
  }
}
```
