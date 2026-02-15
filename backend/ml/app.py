from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from PIL import Image
import io

app = FastAPI()

# Allow your Capacitor app + local dev to call this
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load a small, fast model. Good for demo.
# First run will auto-download weights.
model = YOLO("yolov8n.pt")

RECYCLE = {
    "bottle", "cup", "wine glass", "fork", "knife", "spoon", "bowl",
    "can", "book", "paper", "cardboard", "sports ball"  # tweak later
}
COMPOST = {
    "banana", "apple", "orange", "broccoli", "carrot", "hot dog", "pizza", "sandwich"
}
TRASH = {
    "plastic bag", "straw", "toothbrush", "diaper"  # tweak later
}

def map_label_to_category(label: str) -> str:
    l = label.lower()
    if l in COMPOST:
        return "compost"
    if l in RECYCLE:
        return "recycle"
    if l in TRASH:
        return "trash"
    # Default for demo; you can return "unknown" instead
    return "trash"

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/infer")
async def infer(file: UploadFile = File(...)):
    # Read image bytes
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    # Run YOLO
    results = model.predict(image, imgsz=640, conf=0.25, verbose=False)
    r = results[0]

    detections = []
    if r.boxes is not None and len(r.boxes) > 0:
        # YOLO gives boxes with cls + conf
        for b in r.boxes:
            cls_id = int(b.cls[0].item())
            conf = float(b.conf[0].item())
            label = model.names.get(cls_id, str(cls_id))
            detections.append({"label": label, "confidence": conf})

        # Sort highest confidence first
        detections.sort(key=lambda d: d["confidence"], reverse=True)

        top = detections[0]
        item_type = map_label_to_category(top["label"])
        return {
            "itemType": item_type,        # "trash" | "recycle" | "compost"
            "topLabel": top["label"],
            "confidence": top["confidence"],
            "detections": detections[:5],
        }

    # No detections case
    return {
        "itemType": "trash",
        "topLabel": None,
        "confidence": 0.0,
        "detections": [],
        "note": "No object detected; defaulted to trash.",
    }
