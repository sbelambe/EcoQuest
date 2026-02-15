import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Camera as CameraIcon, X } from "lucide-react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import type { ItemType } from "../data/mockData";
import { EcoQuestVision } from "../plugins/ecoQuestVision";

// import { dataUrlToBlob } from "../utils/upload";

type InferResponse = {
  itemType: ItemType;
  topLabel: string | null;
  confidence: number;
  detections?: { label: string; confidence: number }[];
  note?: string;
};

// ---- Model init: load once per app session ----
let visionInitPromise: Promise<any> | null = null;

export function initVision() {
  if (!visionInitPromise) {
    visionInitPromise = EcoQuestVision.loadModel({
      modelName: "yolo4", // must match bundled filename (without .pte)
      modelExt: "pte",
    });
  }
  return visionInitPromise;
}

export function Scan() {
  const navigate = useNavigate();
  const topSafeOffset = "calc(env(safe-area-inset-top, 0px) + 8px)";
  const [isScanning, setIsScanning] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startedRef = useRef(false);
  const scanningRef = useRef(false); // prevents double-calls even if state lags

  async function captureFromCamera() {
    if (scanningRef.current) return;
    scanningRef.current = true;

    setIsScanning(true);
    setErrorMsg(null);

    try {
      // Ensure model is loaded (safe to call repeatedly due to cached promise)
      await initVision();

      const perm = await Camera.requestPermissions({ permissions: ["camera"] });
      if (perm.camera !== "granted") {
        throw new Error("Camera permission not granted.");
      }

      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      const dataUrl = photo.dataUrl ?? null;
      if (!dataUrl) throw new Error("No image data returned from camera.");

      setPreviewDataUrl(dataUrl);
      sessionStorage.setItem("lastScanImage", dataUrl);

      // Native ExecuTorch inference
      const result = (await EcoQuestVision.infer({ dataUrl })) as InferResponse;

      sessionStorage.setItem("lastScanType", result.itemType);
      sessionStorage.setItem("lastScanLabel", result.topLabel ?? "");
      sessionStorage.setItem("lastScanConfidence", String(result.confidence ?? 0));

      navigate("/scan-result");
    } catch (e: any) {
      const msg = String(e?.message ?? "").toLowerCase();
      const canceled = msg.includes("cancel") || msg.includes("user cancelled");

      if (canceled) {
        navigate("/");
        return;
      }

      console.error(e);
      setErrorMsg(e?.message ?? "Unknown error");
    } finally {
      setIsScanning(false);
      scanningRef.current = false;
    }
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // Auto-open camera on mount
    captureFromCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-[100dvh] bg-black overflow-hidden flex flex-col">
      {/* Top bar */}
      <div
        className="p-4 flex items-center justify-between"
        style={{ paddingTop: topSafeOffset }}
      >
        <button
          onClick={() => navigate("/")}
          className="text-white/80 hover:text-white"
          aria-label="Cancel scan"
        >
          <X size={22} />
        </button>
        <div className="text-white font-semibold">Scan Item</div>
        <div className="w-[22px]" />
      </div>

      {/* Preview / viewfinder */}
      <div className="flex-1 flex items-center justify-center px-6">
        {previewDataUrl ? (
          <div className="w-full max-w-md rounded-2xl overflow-hidden bg-gray-900">
            <img
              src={previewDataUrl}
              alt="Captured preview"
              className="w-full h-[60vh] object-cover"
            />
          </div>
        ) : (
          <div className="w-full max-w-md aspect-[3/4] rounded-2xl border border-white/20 flex flex-col items-center justify-center">
            <CameraIcon className="text-white/70" size={44} />
            <div className="text-white/70 mt-3">Opening camera…</div>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="pb-8 px-6">
        {isScanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="text-white font-medium">Analyzing…</div>
            <div className="text-green-400 text-sm mt-1">
              Using AI to detect item type
            </div>
          </motion.div>
        )}

        {errorMsg && (
          <div className="mt-4 bg-red-500/20 border border-red-400/30 text-red-100 rounded-xl p-4">
            <div className="font-semibold">Scan failed</div>
            <div className="text-sm mt-1">{errorMsg}</div>
            <button
              onClick={captureFromCamera}
              className="mt-3 w-full bg-red-500 text-white py-3 rounded-xl font-medium"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
