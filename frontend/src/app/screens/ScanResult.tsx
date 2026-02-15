import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  CheckCircle,
  Trash2,
  Recycle,
  Leaf,
  Award,
  TrendingUp,
  MapPin,
} from "lucide-react";
import type { ItemType } from "../data/mockData";
import { getPointsForItemType } from "../data/mockData";

export function ScanResult() {
  const navigate = useNavigate();
  const [itemType, setItemType] = useState<ItemType>("recycle");
  const [showConfetti, setShowConfetti] = useState(false);

  const [label, setLabel] = useState<string>("");
const [confidence, setConfidence] = useState<number>(0);


  // NEW
  const [scanImage, setScanImage] = useState<string | null>(null);

  useEffect(() => {
    const storedType = sessionStorage.getItem("lastScanType") as ItemType | null;
    if (storedType) setItemType(storedType);

    const storedImg = sessionStorage.getItem("lastScanImage");
    if (storedImg) setScanImage(storedImg);

      const storedLabel = sessionStorage.getItem("lastScanLabel");
  if (storedLabel) setLabel(storedLabel);

  const storedConf = sessionStorage.getItem("lastScanConfidence");
  if (storedConf) setConfidence(Number(storedConf));

    setShowConfetti(true);
  }, []);

  const points = getPointsForItemType(itemType);

  const typeConfig = {
    trash: {
      icon: Trash2,
      color: "gray",
      bgColor: "bg-gray-100",
      textColor: "text-gray-700",
      accentColor: "bg-gray-500",
      title: "General Waste",
      impact: "Properly disposed of general waste",
      emoji: "🗑️",
    },
    recycle: {
      icon: Recycle,
      color: "blue",
      bgColor: "bg-blue-100",
      textColor: "text-blue-700",
      accentColor: "bg-blue-500",
      title: "Recyclable",
      impact: "You saved 1 plastic bottle from landfill!",
      emoji: "♻️",
    },
    compost: {
      icon: Leaf,
      color: "green",
      bgColor: "bg-green-100",
      textColor: "text-green-700",
      accentColor: "bg-green-500",
      title: "Compostable",
      impact: "You're helping create nutrient-rich soil!",
      emoji: "🌱",
    },
  } as const;

  const config = typeConfig[itemType];
  const Icon = config.icon;

  return (
    <div className="relative h-[100dvh] overflow-y-auto bg-gradient-to-b from-green-50 to-blue-50 p-6 flex flex-col">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="relative inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                y: -100,
                x: Math.random() * window.innerWidth,
                opacity: 1,
              }}
              animate={{ y: window.innerHeight + 100, opacity: 0 }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 0.5,
                ease: "linear",
              }}
              className="absolute text-2xl"
            >
              {["🌟", "✨", "🎉", "🌱", "♻️"][Math.floor(Math.random() * 5)]}
            </motion.div>
          ))}
        </div>
      )}

      {/* Success header */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="flex flex-col items-center justify-center mt-12 mb-8"
      >
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 0.6 }}
          className={`w-24 h-24 ${config.accentColor} rounded-full flex items-center justify-center mb-4`}
        >
          <CheckCircle size={48} className="text-white" />
        </motion.div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Great Job!</h1>
        <p className="text-gray-600 text-center">Item successfully detected</p>
      </motion.div>

      {/* Item type card */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className={`${config.bgColor} rounded-3xl p-6 mb-6`}
      >
        <div className="flex items-center gap-4 mb-4">
          <div
            className={`w-16 h-16 ${config.accentColor} rounded-2xl flex items-center justify-center text-white`}
          >
            <Icon size={32} />
          </div>
          <div className="flex-1">
            <div className={`text-sm ${config.textColor} font-medium`}>
              Detected
            </div>
            <div className="text-2xl font-bold text-gray-800">
              {config.title}
            </div>
          </div>
          <div className="text-5xl">{config.emoji}</div>
        </div>

        {/* Impact message */}
        <div className="bg-white/60 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <TrendingUp size={20} className="text-green-600 mt-1" />
            <div>
              <div className="font-medium text-gray-800">
                Environmental Impact
              </div>
              <div className="text-sm text-gray-600 mt-1">{config.impact}</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Captured image */}
      {scanImage && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-3xl p-4 mb-6 shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-gray-800">Captured Image</div>
            <div className="text-xs text-gray-500">Latest scan</div>
          </div>

          <div className="rounded-2xl bg-gray-100">
            <img
              src={scanImage}
              alt="Last scanned item"
              className="w-full h-56 object-cover"
            />
          </div>
        </motion.div>
      )}

      {/* Points earned */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-3xl p-6 mb-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award size={32} />
            <div>
              <div className="text-sm opacity-90">Points Earned</div>
              <div className="text-3xl font-bold">+{points}</div>
            </div>
          </div>
          <div className="text-6xl">🏆</div>
        </div>
        <div className="mt-4 bg-white/20 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "75%" }}
            transition={{ duration: 1, delay: 0.8 }}
            className="bg-white h-2 rounded-full"
          />
        </div>
        <div className="text-sm mt-2 opacity-90">75 points until next level!</div>
      </motion.div>

      {/* Disposal guidance */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-3xl p-6 shadow-lg"
      >
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <MapPin size={20} className="text-green-600" />
          Next Steps
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          Find the nearest{" "}
          {itemType === "trash"
            ? "trash bin"
            : itemType === "recycle"
            ? "recycling bin"
            : "compost bin"}{" "}
          to properly dispose of this item.
        </p>
        <button
          onClick={() => navigate("/disposal")}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl font-medium shadow-md hover:shadow-lg transition-shadow"
        >
          Find Nearest Bin
        </button>
      </motion.div>

      {/* Action buttons */}
      <div className="mt-auto pt-6 flex gap-3">
        <button
          onClick={() => navigate("/scan")}
          className="flex-1 bg-white border-2 border-green-500 text-green-600 py-4 rounded-xl font-medium"
        >
          Scan Another
        </button>
        <button
          onClick={() => navigate("/")}
          className="flex-1 bg-green-600 text-white py-4 rounded-xl font-medium"
        >
          Done
        </button>
      </div>
    </div>
  );
}
