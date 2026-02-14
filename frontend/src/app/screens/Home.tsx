import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Camera, MapPin, Navigation, Recycle, Leaf, Trash2, ChevronRight, X } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { mockUserStats } from "../data/mockData";

type BinType = "recycle" | "compost" | "trash";

interface BinLocation {
  id: number;
  name: string;
  type: BinType;
  address: string;
  distance: string;
  posX: number; // Percentage 0-100
  posY: number; // Percentage 0-100
}

interface CleanupHotspot {
  id: number;
  posX: number; // Percentage 0-100
  posY: number; // Percentage 0-100
  itemCount: number;
  recentActivity: number;
}

export function Home() {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState<BinType | "all">("all");
  const [showLocationList, setShowLocationList] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<BinLocation | null>(null);

  const binLocations: BinLocation[] = [
    {
      id: 1,
      name: "Civic Center Recycling",
      type: "recycle",
      address: "1 Dr Carlton B Goodlett Pl",
      distance: "0.3 mi",
      posX: 35,
      posY: 25,
    },
    {
      id: 2,
      name: "Mission Community Compost",
      type: "compost",
      address: "456 Valencia St",
      distance: "0.5 mi",
      posX: 65,
      posY: 60,
    },
    {
      id: 3,
      name: "Public Waste Station",
      type: "trash",
      address: "789 Market St",
      distance: "0.2 mi",
      posX: 70,
      posY: 30,
    },
    {
      id: 4,
      name: "Golden Gate Recycling Hub",
      type: "recycle",
      address: "1234 Fulton St",
      distance: "1.2 mi",
      posX: 25,
      posY: 70,
    },
    {
      id: 5,
      name: "North Beach Compost",
      type: "compost",
      address: "567 Columbus Ave",
      distance: "0.8 mi",
      posX: 80,
      posY: 45,
    },
  ];

  const cleanupHotspots: CleanupHotspot[] = [
    { id: 1, posX: 45, posY: 40, itemCount: 23, recentActivity: 8 },
    { id: 2, posX: 55, posY: 20, itemCount: 15, recentActivity: 5 },
    { id: 3, posX: 30, posY: 55, itemCount: 31, recentActivity: 12 },
    { id: 4, posX: 60, posY: 75, itemCount: 19, recentActivity: 6 },
  ];

  const filteredBins = selectedFilter === "all" 
    ? binLocations 
    : binLocations.filter(bin => bin.type === selectedFilter);

  const getBinIcon = (type: BinType) => {
    switch (type) {
      case "recycle": return Recycle;
      case "compost": return Leaf;
      case "trash": return Trash2;
    }
  };

  const getBinColor = (type: BinType) => {
    switch (type) {
      case "recycle": return "bg-blue-500";
      case "compost": return "bg-green-500";
      case "trash": return "bg-gray-500";
    }
  };

  const getBinBorderColor = (type: BinType) => {
    switch (type) {
      case "recycle": return "border-blue-500";
      case "compost": return "border-green-500";
      case "trash": return "border-gray-500";
    }
  };

  return (
    <div className="w-full h-screen bg-gradient-to-b from-green-50 to-blue-50 overflow-hidden flex flex-col">
      {/* Container with max width for desktop */}
      <div className="relative w-full flex-1 max-w-screen-sm mx-auto flex flex-col">
        {/* Full screen map */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-green-50 to-blue-100 touch-none select-none overflow-hidden">
          {/* User location marker - center */}
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute z-10"
            style={{ 
              left: '50%', 
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-xl border-4 border-white">
              <Navigation size={24} className="text-white sm:w-7 sm:h-7" />
            </div>
            <div className="absolute inset-0 bg-blue-600 rounded-full opacity-20 animate-ping" />
          </motion.div>

          {/* Bin markers */}
          {filteredBins.map((bin) => {
            const Icon = getBinIcon(bin.type);
            const isSelected = selectedLocation?.id === bin.id;
            
            return (
              <motion.button
                key={bin.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedLocation(bin)}
                className={`absolute ${getBinColor(bin.type)} rounded-2xl shadow-lg border-4 border-white cursor-pointer transition-all touch-manipulation ${
                  isSelected ? "ring-4 ring-yellow-400 z-20" : "z-10"
                }`}
                style={{
                  left: `${bin.posX}%`,
                  top: `${bin.posY}%`,
                  transform: 'translate(-50%, -50%)',
                  width: isSelected ? "56px" : "48px",
                  height: isSelected ? "56px" : "48px",
                }}
              >
                <Icon size={isSelected ? 28 : 24} className="text-white mx-auto" />
              </motion.button>
            );
          })}

          {/* Cleanup hotspot markers */}
          {cleanupHotspots.map((hotspot) => (
            <motion.div
              key={hotspot.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="absolute z-10"
              style={{
                left: `${hotspot.posX}%`,
                top: `${hotspot.posY}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="relative">
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg border-3 border-white animate-pulse">
                  <span className="text-white font-bold text-xs sm:text-sm">{hotspot.recentActivity}</span>
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                  {hotspot.itemCount}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Top bar */}
        <div className="relative p-3 sm:p-4 z-20 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-3 sm:p-4 flex items-center justify-between pointer-events-auto">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">EcoQuest</h1>
              <p className="text-xs text-gray-600">San Francisco</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-right">
                <div className="text-xs sm:text-sm text-gray-600">Level {mockUserStats.level}</div>
                <div className="text-base sm:text-lg font-bold text-green-600">{mockUserStats.points}</div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-xl sm:text-2xl">
                🦝
              </div>
            </div>
          </div>
        </div>

        {/* Filter buttons - Right side */}
        <div className="absolute top-20 sm:top-24 right-3 sm:right-4 z-20 space-y-2 pointer-events-none">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLocationList(!showLocationList)}
            className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-2xl shadow-lg flex items-center justify-center border-2 border-gray-200 hover:border-green-500 transition-colors pointer-events-auto touch-manipulation"
          >
            <MapPin size={20} className="text-green-600 sm:w-6 sm:h-6" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedFilter("all")}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shadow-lg flex items-center justify-center border-2 transition-colors pointer-events-auto touch-manipulation ${
              selectedFilter === "all" 
                ? "bg-green-500 border-green-600" 
                : "bg-white border-gray-200"
            }`}
          >
            <span className="text-xl sm:text-2xl">🌍</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedFilter(selectedFilter === "recycle" ? "all" : "recycle")}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shadow-lg flex items-center justify-center border-2 transition-colors pointer-events-auto touch-manipulation ${
              selectedFilter === "recycle" 
                ? "bg-blue-500 border-blue-600" 
                : "bg-white border-gray-200"
            }`}
          >
            <Recycle size={20} className={`sm:w-6 sm:h-6 ${selectedFilter === "recycle" ? "text-white" : "text-blue-600"}`} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedFilter(selectedFilter === "compost" ? "all" : "compost")}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shadow-lg flex items-center justify-center border-2 transition-colors pointer-events-auto touch-manipulation ${
              selectedFilter === "compost" 
                ? "bg-green-500 border-green-600" 
                : "bg-white border-gray-200"
            }`}
          >
            <Leaf size={20} className={`sm:w-6 sm:h-6 ${selectedFilter === "compost" ? "text-white" : "text-green-600"}`} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedFilter(selectedFilter === "trash" ? "all" : "trash")}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shadow-lg flex items-center justify-center border-2 transition-colors pointer-events-auto touch-manipulation ${
              selectedFilter === "trash" 
                ? "bg-gray-500 border-gray-600" 
                : "bg-white border-gray-200"
            }`}
          >
            <Trash2 size={20} className={`sm:w-6 sm:h-6 ${selectedFilter === "trash" ? "text-white" : "text-gray-600"}`} />
          </motion.button>
        </div>

        {/* Location list panel */}
        <AnimatePresence>
          {showLocationList && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="absolute top-20 sm:top-24 right-3 sm:right-4 left-3 sm:left-4 bottom-24 z-30 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-500 to-green-600">
                <h2 className="text-base sm:text-lg font-bold text-white">Nearby Locations</h2>
                <button
                  onClick={() => setShowLocationList(false)}
                  className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center touch-manipulation"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
                {filteredBins.map((bin) => {
                  const Icon = getBinIcon(bin.type);
                  const isSelected = selectedLocation?.id === bin.id;
                  
                  return (
                    <motion.button
                      key={bin.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedLocation(bin);
                        setShowLocationList(false);
                      }}
                      className={`w-full bg-white rounded-xl p-3 sm:p-4 shadow-md border-2 transition-colors touch-manipulation ${
                        isSelected ? getBinBorderColor(bin.type) : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${getBinColor(bin.type)} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <Icon size={20} className="text-white sm:w-6 sm:h-6" />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="font-bold text-gray-800 text-sm sm:text-base">{bin.name}</h3>
                          <p className="text-xs sm:text-sm text-gray-600">{bin.address}</p>
                          <p className="text-xs text-gray-500 mt-1">{bin.distance} away</p>
                        </div>
                        <ChevronRight size={20} className="text-gray-400" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected location card */}
        <AnimatePresence>
          {selectedLocation && !showLocationList && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-24 sm:bottom-28 left-3 sm:left-4 right-3 sm:right-4 z-30"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 ${getBinColor(selectedLocation.type)} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    {(() => {
                      const Icon = getBinIcon(selectedLocation.type);
                      return <Icon size={24} className="text-white sm:w-7 sm:h-7" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-base sm:text-lg truncate">{selectedLocation.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">{selectedLocation.address}</p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin size={12} />
                      {selectedLocation.distance} away
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedLocation(null)}
                    className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 touch-manipulation"
                  >
                    <X size={16} className="text-gray-600" />
                  </button>
                </div>
                <button className="w-full mt-3 sm:mt-4 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg touch-manipulation text-sm sm:text-base">
                  <Navigation size={20} />
                  Get Directions
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scan Button */}
        <div className="absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/scan")}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-full shadow-2xl flex items-center gap-2 sm:gap-3 font-bold text-base sm:text-lg border-4 border-white pointer-events-auto touch-manipulation"
          >
            <Camera size={28} className="sm:w-8 sm:h-8" />
            Scan Item
          </motion.button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-20 sm:bottom-24 left-3 sm:left-4 z-20 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-2 sm:p-3 space-y-2 pointer-events-auto">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">5</span>
              </div>
              <span className="text-xs text-gray-700 font-medium">Hotspots</span>
            </div>
          </div>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}