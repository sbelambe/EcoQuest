import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { MapPin, Navigation, CheckCircle, ArrowLeft, Trash2, Recycle, Leaf } from "lucide-react";

export function Disposal() {
  const navigate = useNavigate();
  const [disposed, setDisposed] = useState(false);

  const nearbyBins = [
    {
      id: 1,
      type: "recycle",
      name: "Recycling Station",
      address: "123 Market St",
      distance: "0.2 miles",
      walkTime: "4 min walk",
      icon: Recycle,
      color: "blue",
    },
    {
      id: 2,
      type: "compost",
      name: "Community Compost",
      address: "456 Green Ave",
      distance: "0.4 miles",
      walkTime: "8 min walk",
      icon: Leaf,
      color: "green",
    },
    {
      id: 3,
      type: "trash",
      name: "Public Waste Bin",
      address: "789 Mission Blvd",
      distance: "0.1 miles",
      walkTime: "2 min walk",
      icon: Trash2,
      color: "gray",
    },
  ];

  const handleDisposed = () => {
    setDisposed(true);
    setTimeout(() => {
      navigate("/");
    }, 2000);
  };

  if (disposed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 0.6 }}
            className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle size={64} className="text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Awesome!</h2>
          <p className="text-gray-600">You've completed the full cycle 🌍</p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-green-600 font-medium"
          >
            Returning to home...
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">Find Disposal</h1>
            <p className="text-sm text-gray-600">Nearest bins in your area</p>
          </div>
        </div>
      </div>

      {/* Map preview */}
      <div className="p-6">
        <div className="bg-gradient-to-br from-blue-200 to-green-200 rounded-2xl h-64 relative overflow-hidden shadow-lg">
          {/* Map placeholder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin size={48} className="text-green-600 mx-auto mb-2" />
              <p className="text-gray-700 font-medium">Your Location</p>
              <p className="text-sm text-gray-600">Mission District, SF</p>
            </div>
          </div>

          {/* Bin markers */}
          {nearbyBins.map((bin, index) => (
            <motion.div
              key={bin.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`absolute w-8 h-8 bg-${bin.color}-500 rounded-full border-4 border-white shadow-lg`}
              style={{
                top: `${30 + index * 20}%`,
                left: `${40 + index * 15}%`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Bins list */}
      <div className="px-6 pb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Nearby Bins</h2>
        <div className="space-y-3">
          {nearbyBins.map((bin) => {
            const Icon = bin.icon;
            return (
              <motion.div
                key={bin.id}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: bin.id * 0.1 }}
                className="bg-white rounded-2xl p-4 shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 bg-${bin.color}-100 rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon size={28} className={`text-${bin.color}-600`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 truncate">{bin.name}</h3>
                    <p className="text-sm text-gray-600 truncate">{bin.address}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin size={12} />
                        {bin.distance}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Navigation size={12} />
                        {bin.walkTime}
                      </span>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors flex-shrink-0">
                    Navigate
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Confirmation button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-200">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleDisposed}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2"
        >
          <CheckCircle size={24} />
          Confirm Disposal
        </motion.button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Tap after disposing the item properly
        </p>
      </div>
    </div>
  );
}
