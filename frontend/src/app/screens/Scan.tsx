import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Camera, X, Zap, Image as ImageIcon } from "lucide-react";
import type { ItemType } from "../data/mockData";

export function Scan() {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);

  const handleCapture = () => {
    setIsScanning(true);

    // Simulate AI detection
    setTimeout(() => {
      // Randomly select item type for demo
      const types: ItemType[] = ["trash", "recycle", "compost"];
      const randomType = types[Math.floor(Math.random() * types.length)];
      
      // Store in sessionStorage for the result screen
      sessionStorage.setItem("lastScanType", randomType);
      navigate("/scan-result");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Camera viewfinder simulation */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800">
        {/* Grid overlay */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="border border-white/10" />
          ))}
        </div>

        {/* Center focus area */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-64 h-64 border-4 border-green-500 rounded-3xl relative"
          >
            {/* Corner markers */}
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-bl-lg" />
          </motion.div>
        </div>

        {/* Scanning overlay */}
        {isScanning && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: "100vh" }}
            transition={{ duration: 2, ease: "linear" }}
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"
          />
        )}
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
        <button
          onClick={() => navigate("/")}
          className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
        >
          <X size={24} />
        </button>
        <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm flex items-center gap-2">
          <Zap size={16} className="text-yellow-400" />
          AI Detection Active
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-24 left-0 right-0 px-6 z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/70 backdrop-blur-md text-white p-4 rounded-2xl text-center"
        >
          <p className="font-medium">Position item in the frame</p>
          <p className="text-sm text-gray-300 mt-1">Our AI will detect trash, recycle, or compost</p>
        </motion.div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-12 z-10">
        <div className="flex items-center justify-center gap-8">
          {/* Gallery button */}
          <button className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white">
            <ImageIcon size={24} />
          </button>

          {/* Capture button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleCapture}
            disabled={isScanning}
            className="relative"
          >
            <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-transparent">
              <motion.div
                animate={
                  isScanning
                    ? {
                        scale: [1, 1.2, 1],
                        backgroundColor: ["#22c55e", "#16a34a", "#22c55e"],
                      }
                    : {}
                }
                transition={{ duration: 1, repeat: isScanning ? Infinity : 0 }}
                className="w-16 h-16 rounded-full bg-white"
              />
            </div>
            {isScanning && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Camera size={32} className="text-white" />
              </motion.div>
            )}
          </motion.button>

          {/* Flash button */}
          <button className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white">
            <Zap size={24} />
          </button>
        </div>

        {isScanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center"
          >
            <div className="text-white font-medium">Analyzing...</div>
            <div className="text-green-400 text-sm mt-1">Using AI to detect item type</div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
