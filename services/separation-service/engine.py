import os
import sys
import shutil
import subprocess
from pathlib import Path
from typing import Dict

# Import the secondary residual-subtraction refinement and vocal silence gater
sys.path.append(os.path.dirname(__file__))
from refine import refine_stems_file

class StemSeparationEngine:
    """
    SplitStream 2-Stem Source Separation Engine with Bleed Elimination.
    Strictly decomposes audio into two isolated outputs in native two-stems mode:
    1. Vocals (vocals.wav)
    2. Instrument (instrument.wav, mapped directly from no_vocals.wav)

    QUALITY & SPEED TRADEOFF ARCHITECTURE (Section A.2):
    - Model: htdemucs_ft (Fine-tuned hybrid transformer). Meaningfully cleaner separation than base htdemucs.
    - Shifts: Configurable via DEMUCS_SHIFTS environment variable (default: 5).
      Each shift performs a time-shifted forward pass and averages outputs. Shifts=5 eliminates random model
      artifacts and spectral leakage (~5x inference time). Under heavy server load, setting DEMUCS_SHIFTS=2
      reduces processing time while retaining acceptable isolation.
    - Overlap: Configurable via DEMUCS_OVERLAP environment variable (default: 0.5).
      Increasing chunk overlap from 0.25 to 0.50 eliminates boundary artifacts and edge bleed at chunk seams.
    - Secondary Refinement (Section A.3 & A.4):
      STFT-based residual cross-masking between stems suppresses remaining leakage, followed by RMS energy
      silence-gating on dead sections of the vocal stem with 15ms crossfades.
    """
    def __init__(self, model_name: str = "htdemucs_ft"):
        self.model_name = os.environ.get("DEMUCS_MODEL", model_name)
        self.shifts = int(os.environ.get("DEMUCS_SHIFTS", "5"))
        self.overlap = float(os.environ.get("DEMUCS_OVERLAP", "0.5"))
        self.device = "cpu"
        self._check_device()

    def _check_device(self):
        try:
            import torch
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            self.device = "cpu"

    def separate_audio_file(self, input_path: str, output_dir: str) -> Dict[str, str]:
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input audio file not found: {input_path}")

        os.makedirs(output_dir, exist_ok=True)
        final_vocals = os.path.join(output_dir, "vocals.wav")
        final_instrument = os.path.join(output_dir, "instrument.wav")

        # Clean prior target files if present in the output directory
        for f in [final_vocals, final_instrument]:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except Exception:
                    pass

        # 1. Try Demucs CLI or Python module execution with fine-tuned checkpoint & high-quality inference settings
        demucs_cli = shutil.which("demucs")
        demucs_cmd = [demucs_cli] if demucs_cli else [sys.executable, "-m", "demucs"]

        print(f"[SeparationEngine] Running Demucs ({self.model_name}, shifts={self.shifts}, overlap={self.overlap}, device={self.device})...")
        cmd = demucs_cmd + [
            "--two-stems=vocals",
            "-n", self.model_name,
            "--shifts", str(self.shifts),
            "--overlap", str(self.overlap),
            "-d", self.device,
            input_path,
            "-o", output_dir
        ]

        try:
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode != 0:
                print(f"[SeparationEngine] Demucs command failed with code {res.returncode}: {res.stderr}")
                # If fine-tuned model checkpoint failed to download or load, retry with base htdemucs
                if self.model_name != "htdemucs":
                    print("[SeparationEngine] Retrying with base htdemucs checkpoint...")
                    cmd[cmd.index(self.model_name)] = "htdemucs"
                    res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode == 0:
                self._collect_and_rename_stems(output_dir, final_vocals, final_instrument)
        except Exception as e:
            print(f"[SeparationEngine] CLI execution error: {e}")

        # 2. If CLI/module didn't produce files, fallback to PyTorch direct apply
        if not (os.path.exists(final_vocals) and os.path.exists(final_instrument)):
            self._try_python_demucs(input_path, output_dir, final_vocals, final_instrument)

        # Fail loudly if either output file is missing or empty
        if not os.path.exists(final_vocals) or os.path.getsize(final_vocals) == 0:
            raise RuntimeError(f"Separation failed loudly: vocals.wav is missing or empty in {output_dir}")
        if not os.path.exists(final_instrument) or os.path.getsize(final_instrument) == 0:
            raise RuntimeError(f"Separation failed loudly: instrument.wav is missing or empty in {output_dir}")

        # 3. Mandatory Secondary Residual-Subtraction Refinement Pass (Section A.3)
        # & Silence/Activity Gating for Dead Sections on Vocal Stem (Section A.4)
        print("[SeparationEngine] Running secondary residual cross-masking & vocal activity gating...")
        try:
            refine_stems_file(final_vocals, final_instrument)
            print("[SeparationEngine] Secondary refinement completed successfully.")
        except Exception as ref_err:
            print(f"[SeparationEngine] Refinement pass warning (continuing with stems): {ref_err}")

        return {
            "vocals": final_vocals,
            "instrument": final_instrument,
        }

    def _collect_and_rename_stems(self, output_dir: str, final_vocals: str, final_instrument: str):
        # Demucs places outputs in <output_dir>/<model_name>/<track_name>/
        for root, _, files in os.walk(output_dir):
            for file in files:
                full_path = os.path.join(root, file)
                if file.lower() == "vocals.wav" and full_path != final_vocals:
                    shutil.move(full_path, final_vocals)
                elif file.lower() in ["no_vocals.wav", "instrument.wav"] and full_path != final_instrument:
                    shutil.move(full_path, final_instrument)

    def _try_python_demucs(self, input_path: str, output_dir: str, final_vocals: str, final_instrument: str):
        try:
            import torch
            import torchaudio
            from demucs.pretrained import get_model
            from demucs.apply import apply_model

            print(f"[SeparationEngine] Running Demucs via PyTorch API on {self.device}...")
            try:
                model = get_model(self.model_name)
            except Exception:
                model = get_model("htdemucs")

            model.to(self.device)
            model.eval()

            wav, sr = torchaudio.load(input_path)
            if wav.shape[0] == 1:
                wav = wav.repeat(2, 1)

            if sr != model.samplerate:
                resampler = torchaudio.transforms.Resample(sr, model.samplerate)
                wav = resampler(wav)
                sr = model.samplerate

            wav_input = wav.unsqueeze(0).to(self.device)
            with torch.no_grad():
                sources = apply_model(
                    model,
                    wav_input,
                    device=self.device,
                    split=True,
                    overlap=self.overlap,
                    shifts=self.shifts
                )

            sources = sources.squeeze(0).cpu()
            source_names = list(model.sources)
            vocal_idx = source_names.index("vocals") if "vocals" in source_names else len(source_names) - 1

            vocals_tensor = sources[vocal_idx]
            instrument_tensor = wav.cpu() - vocals_tensor

            torchaudio.save(final_vocals, vocals_tensor, sr)
            torchaudio.save(final_instrument, instrument_tensor, sr)
        except Exception as e:
            print(f"[SeparationEngine] Python Demucs direct execution error: {e}")

engine = StemSeparationEngine()
