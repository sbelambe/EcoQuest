import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  MapPin,
  Navigation,
  CheckCircle,
  ArrowLeft,
  Trash2,
  Recycle,
  Leaf,
} from "lucide-react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import { addStoredPoints } from "../data/points";
import { mockUserStats, type ItemType } from "../data/mockData";

type BinType = "trash" | "recycle" | "compost";

interface BinLocation {
  id: string;
  name: string;
  type: BinType;
  address: string;
  position: { lat: number; lng: number };
}

const BACKEND_URL_STORAGE_KEY = "ecoquest_backend_url";

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function toBinType(itemType: ItemType): BinType {
  if (itemType === "recycle") return "recycle";
  if (itemType === "compost") return "compost";
  return "trash";
}

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function Disposal() {
  const navigate = useNavigate();
  const location = useLocation();
  const topSafeOffset = "calc(env(safe-area-inset-top, 0px) + 8px)";
  const [disposed, setDisposed] = useState(false);
  const [isLoadingBins, setIsLoadingBins] = useState(false);
  const [binsError, setBinsError] = useState<string | null>(null);
  const [allBins, setAllBins] = useState<BinLocation[]>([]);
  const [userLocation, setUserLocation] = useState({ lat: 37.7793, lng: -122.4192 });

  const detectedType =
    ((location.state as { itemType?: ItemType } | null)?.itemType as ItemType | undefined) ??
    (sessionStorage.getItem("lastScanType") as ItemType | null) ??
    "trash";
  const targetType = toBinType(detectedType);

  const envBackendBaseUrl =
    (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? "http://localhost:8080";
  const backendBaseUrl = useMemo(() => {
    const saved = window.localStorage.getItem(BACKEND_URL_STORAGE_KEY);
    return normalizeBaseUrl(saved ?? envBackendBaseUrl);
  }, [envBackendBaseUrl]);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        // fallback to Civic Center coords
      },
      { enableHighAccuracy: true, timeout: 4000 },
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadNearbyBins() {
      setIsLoadingBins(true);
      setBinsError(null);

      try {
        const url = `${backendBaseUrl}/api/trashcans/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&limit=40&maxDistance=3000`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${text.slice(0, 140)}`);
        }

        const mapped: BinLocation[] = (data.items ?? []).map((x: any) => ({
          id: String(x.id),
          name: x.name ?? "Trash Can",
          type: (x.type ?? "trash") as BinType,
          address: x.address ?? "",
          position: x.position,
        }));
        setAllBins(mapped);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setBinsError(msg);
        setAllBins([]);
      } finally {
        setIsLoadingBins(false);
      }
    }

    loadNearbyBins();
    return () => controller.abort();
  }, [backendBaseUrl, userLocation.lat, userLocation.lng]);

  const typedBins = allBins.filter((b) => b.type === targetType);
  const bins = typedBins.length > 0 ? typedBins : allBins;

  const binsWithDistance = bins.map((bin) => {
    const meters = distanceMeters(userLocation, bin.position);
    const miles = meters * 0.000621371;
    const walkMin = Math.max(1, Math.ceil(meters / 84)); // ~1.4 m/s
    return {
      ...bin,
      distance: `${miles.toFixed(1)} miles`,
      walkTime: `${walkMin} min walk`,
    };
  });

  const getIcon = (type: BinType) => {
    if (type === "recycle") return Recycle;
    if (type === "compost") return Leaf;
    return Trash2;
  };

  const getColorClasses = (type: BinType) => {
    if (type === "recycle") return { iconBg: "bg-blue-100", iconColor: "text-blue-600", marker: "blue" };
    if (type === "compost") return { iconBg: "bg-green-100", iconColor: "text-green-600", marker: "green" };
    return { iconBg: "bg-gray-100", iconColor: "text-gray-600", marker: "gray" };
  };

  const markerIconUrl = (type: BinType) => {
    if (type === "recycle") return "https://maps.google.com/mapfiles/ms/icons/blue-dot.png";
    if (type === "compost") return "https://maps.google.com/mapfiles/ms/icons/green-dot.png";
    return "https://maps.google.com/mapfiles/ms/icons/ltblue-dot.png";
  };

  const handleDisposed = () => {
    addStoredPoints(15, mockUserStats.points);
    setDisposed(true);
    setTimeout(() => {
      navigate("/");
    }, 2000);
  };

  const openDirections = (dest: { lat: number; lng: number }) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`;
    window.open(url, "_blank");
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
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 pb-44">
      <div
        className="bg-white border-b border-gray-200 p-6 sticky top-0 z-10"
        style={{ paddingTop: topSafeOffset }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">Find Disposal</h1>
            <p className="text-sm text-gray-600">
              Nearest {targetType} bins in your area
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="rounded-2xl h-64 relative overflow-hidden shadow-lg bg-white">
          {!isLoaded ? (
            <div className="w-full h-full flex items-center justify-center text-gray-500">Loading map...</div>
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={userLocation}
              zoom={15}
              options={{ disableDefaultUI: true, clickableIcons: false }}
            >
              <Marker position={userLocation} />
              {bins.map((bin) => (
                <Marker key={bin.id} position={bin.position} icon={markerIconUrl(bin.type)} />
              ))}
            </GoogleMap>
          )}
        </div>
      </div>

      <div className="px-6 pb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Nearby Bins</h2>
        {isLoadingBins ? (
          <div className="text-sm text-gray-600">Loading nearby bins...</div>
        ) : binsError ? (
          <div className="text-sm text-red-600">
            Failed to load bins: {binsError}
          </div>
        ) : binsWithDistance.length === 0 ? (
          <div className="text-sm text-gray-600">
            No nearby bins found. Try reloading from Home and checking backend URL.
          </div>
        ) : (
          <div className="space-y-3">
            {binsWithDistance.slice(0, 8).map((bin, index) => {
              const Icon = getIcon(bin.type);
              const color = getColorClasses(bin.type);
              return (
                <motion.div
                  key={bin.id}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl p-4 shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 ${color.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon size={28} className={color.iconColor} />
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
                    <button
                      onClick={() => openDirections(bin.position)}
                      className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors flex-shrink-0"
                    >
                      Navigate
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

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
