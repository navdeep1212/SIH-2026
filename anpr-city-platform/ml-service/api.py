import os
import shutil
import tempfile
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from video_processor import process_video

app = FastAPI(title="ANPR Video Processing API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    """
    Simple health check endpoint.
    """
    return {"status": "ok", "service": "ml"}

@app.post("/process-video")
def process_video_endpoint(
    video: UploadFile = File(...),
    camera_id: str = Form("CAM_01")
):
    """
    Accepts an uploaded video file and camera_id, processes the video through
    the YOLOv8 + ByteTrack + EasyOCR pipeline, and returns finalized detection events.
    """
    if not video.filename:
        raise HTTPException(status_code=400, detail="No video file provided")

    suffix = os.path.splitext(video.filename)[1]
    if not suffix:
        suffix = ".mp4"

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp_path = temp_file.name

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
        temp_file.close()

        # Run video processor (disable verbose console frame spam for API endpoint)
        events = process_video(video_path=temp_path, camera_id=camera_id, verbose=False)

        return {
            "camera_id": camera_id,
            "events": events
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=False)
