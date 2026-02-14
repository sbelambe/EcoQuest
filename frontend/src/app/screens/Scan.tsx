import { useState, useEffect, use } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Camera as CameraIcon, X, Zap, Image as ImageIcon } from "lucide-react";
import type { ItemType } from "../data/mockData";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

export function Scan() {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  async function captureFromCamera() {
    console.log("captureFromCamera called");
    const perm = await Camera.requestPermissions({ permissions: ["camera"] });
    console.log("perm:", perm);

    if (isScanning) return;
    setIsScanning(true);

    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl, // easiest for quick demo
        source: CameraSource.Camera,
      });

      // photo.dataUrl is a complete "data:image/jpeg;base64,..." string
      const dataUrl = photo.dataUrl ?? null;
      setPreviewDataUrl(dataUrl);

      // Store for next screen (so ScanResult can show it later if you want)
      if (dataUrl) sessionStorage.setItem("lastScanImage", dataUrl);

      // TODO: Replace this block with "call native model" later.
      // For now, keep your demo randomizer:
      const types: ItemType[] = ["trash", "recycle", "compost"];
      const randomType = types[Math.floor(Math.random() * types.length)];
      sessionStorage.setItem("lastScanType", randomType);

      navigate("/scan-result");
    } catch (e: any) {
      const msg = (e?.message ?? "").toLowerCase();
      const canceled = msg.includes("cancel") || msg.includes("user cancelled");
      if (canceled) navigate("/");
      else alert("Camera capture failed: " + (e?.message ?? "unknown"));
    }
  }

  async function pickFromGallery() {
    if (isScanning) return;
    setIsScanning(true);

    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });

      const dataUrl = photo.dataUrl ?? null;
      setPreviewDataUrl(dataUrl);
      if (dataUrl) sessionStorage.setItem("lastScanImage", dataUrl);

      const types: ItemType[] = ["trash", "recycle", "compost"];
      const randomType = types[Math.floor(Math.random() * types.length)];
      sessionStorage.setItem("lastScanType", randomType);

      navigate("/scan-result");
    } catch (e) {
      console.error("Gallery pick failed:", e);
      alert("Could not open photos.");
    } finally {
      setIsScanning(false);
    }
  }

  useEffect(() => {
    captureFromCamera();
  }, []);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Live-ish view: show preview if we have one, else your existing viewfinder */}


        {isScanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center"
          >
            <div className="text-white font-medium">Analyzing...</div>
            <div className="text-green-400 text-sm mt-1">
              Using AI to detect item type
            </div>
          </motion.div>
        )}
      </div>
  );
}
