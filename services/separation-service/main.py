import os
import uuid
import base64
import shutil
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional

from engine import engine

app = FastAPI(
    title="SplitStream Separation Microservice",
    version="2.0.0",
    description="High-performance 2-stem source separation API (Vocals & Instrument)"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = Path("./tmp_microservice")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

class SeparateRequest(BaseModel):
    input_path: str
    output_dir: str
    model: Optional[str] = "htdemucs_ft"

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "SplitStream 2-Stem Source Separation Engine",
        "device": engine.device,
        "model": "Demucs v4 FT (htdemucs_ft: Vocals & Instrument)",
        "two_stems": True,
        "shifts": engine.shifts,
        "overlap": engine.overlap,
    }

@app.post("/separate")
async def separate_paths(req: SeparateRequest):
    """
    Path-based separation endpoint sharing local job disk with Node.js host.
    Avoids binary network transfer of large audio buffers.
    """
    if not os.path.exists(req.input_path):
        raise HTTPException(status_code=400, detail=f"Input file not found: {req.input_path}")

    try:
        results = engine.separate_audio_file(req.input_path, req.output_dir)
        return {
            "status": "completed",
            "model": f"Demucs v4 FT ({engine.model_name}: Vocals & Instrument)",
            "vocals_path": results["vocals"],
            "instrument_path": results["instrument"],
            "engine": "demucs",
            "shifts": engine.shifts,
            "overlap": engine.overlap,
            "refined": True,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Separation failed: {str(e)}")

@app.get("/api/models")
def list_models():
    return {
        "models": [
            {"id": "htdemucs_ft", "name": "Demucs v4 Fine-Tuned (Vocals / Instrument)", "stems": 2},
            {"id": "htdemucs", "name": "Demucs v4 Base (Vocals / Instrument)", "stems": 2},
        ],
        "default": "htdemucs_ft",
    }

@app.post("/api/separate")
async def separate_audio(
    file: UploadFile = File(...),
    output_format: Optional[str] = Form("wav"),
):
    job_id = str(uuid.uuid4())
    job_dir = TEMP_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    input_file_path = job_dir / f"input_{file.filename}"
    with open(input_file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    output_stems_dir = job_dir / "stems"
    output_stems_dir.mkdir(parents=True, exist_ok=True)

    try:
        results = engine.separate_audio_file(str(input_file_path), str(output_stems_dir))
        
        encoded_stems = {}
        for stem_name in ["vocals", "instrument"]:
            file_path = results.get(stem_name)
            if file_path and os.path.exists(file_path):
                with open(file_path, "rb") as sf:
                    b64 = base64.b64encode(sf.read()).decode("utf-8")
                    encoded_stems[stem_name] = f"data:audio/wav;base64,{b64}"

        return {
            "job_id": job_id,
            "status": "completed",
            "model": "Demucs v4 (2-Stem)",
            "stems": encoded_stems,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Separation failed: {str(e)}")

@app.get("/api/stems/{job_id}/{stem_name}")
def download_stem(job_id: str, stem_name: str):
    if stem_name not in ["vocals", "instrument"]:
        raise HTTPException(status_code=400, detail="Invalid stem name. Must be 'vocals' or 'instrument'.")
    stem_file = TEMP_DIR / job_id / "stems" / f"{stem_name}.wav"
    if not stem_file.exists():
        raise HTTPException(status_code=404, detail="Stem file not found")
    return FileResponse(stem_file, media_type="audio/wav", filename=f"{stem_name}.wav")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
