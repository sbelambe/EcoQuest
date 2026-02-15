import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  MapPin,
  Navigation,
  Recycle,
  Leaf,
  Trash2,
  ChevronRight,
  X,
} from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { mockUserStats } from "../data/mockData";
import { GoogleMap, useLoadScript } from "@react-google-maps/api";
import { registerPlugin } from "@capacitor/core";

const EcoQuestVision = registerPlugin<{
  ping: () => Promise<{ ok: boolean; message: string }>;
  scan: (options: {
    imageBase64: string;
  }) => Promise<{ binType: string; confidence: number; label: string }>;
}>("EcoQuestVision");

type BinType = "recycle" | "compost" | "trash";

interface LatLng {
  lat: number;
  lng: number;
}

interface BinLocation {
  id: string; // <-- change from number to string
  name: string;
  type: BinType;
  address: string;
  distance?: string;
  position: LatLng;
}

interface CleanupHotspot {
  id: number;
  position: LatLng;
  itemCount: number;
  recentActivity: number;
}

const LUCIDE_PATHS: Record<BinType, string[]> = {
  recycle: [
    // lucide "recycle" icon path(s)
    "M7 19H4v-3",
    "M4 16a8 8 0 0 1 13.657-5.657L20 12",
    "M20 5v3h-3",
    "M20 8a8 8 0 0 1-13.657 5.657L4 12",
  ],
  compost: [
    // lucide "leaf" icon path(s)
    "M11 20A7 7 0 0 1 4 13C4 7 11 4 20 4c0 9-3 16-9 16Z",
    "M20 4c-6 1-11 6-12 12",
  ],
  trash: [
    // lucide "trash-2" icon path(s)
    "M3 6h18",
    "M8 6V4h8v2",
    "M19 6l-1 14H6L5 6",
    "M10 11v6",
    "M14 11v6",
  ],
};

const getLucideMarkerIcon = (type: BinType): google.maps.Symbol => {
  // Combine paths into a single path string.
  // Google Maps Symbol path supports SVG path commands.
  const path = LUCIDE_PATHS[type].join(" ");

  const colors =
    type === "recycle"
      ? { stroke: "#2563eb", fill: "#2563eb" } // blue
      : type === "compost"
      ? { stroke: "#16a34a", fill: "#16a34a" } // green
      : { stroke: "#4b5563", fill: "#4b5563" }; // gray

  return {
    path,
    fillColor: colors.fill,
    fillOpacity: 1,
    strokeColor: colors.stroke,
    strokeOpacity: 1,
    strokeWeight: 2,
    // Adjust these to get your preferred size
    scale: 1.6,
    // Centers the icon on the coordinate (tweak if needed)
    anchor: new google.maps.Point(12, 12),
  };
};
const PROXY_LOCATIONS = [
  { key: "mission", label: "Mission (test)", lat: 37.7596, lng: -122.4269 },
  { key: "civic", label: "Civic Center", lat: 37.7793, lng: -122.4192 },
  { key: "ferry", label: "Ferry Building", lat: 37.7955, lng: -122.3937 },
] as const;

export function Home() {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState<BinType | "all">("all");
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [showLocationList, setShowLocationList] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<BinLocation | null>(
    null,
  );

  const [useProxy, setUseProxy] = useState(true);
  const [proxyKey, setProxyKey] =
    useState<(typeof PROXY_LOCATIONS)[number]["key"]>("civic");
  const [userLocation, setUserLocation] = useState<LatLng>(PROXY_LOCATIONS[0]);
  const [binLocations, setBinLocations] = useState<BinLocation[]>([]);

  const activeLocation = useProxy
    ? PROXY_LOCATIONS.find((p) => p.key === proxyKey) ?? PROXY_LOCATIONS[0]
    : userLocation;

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["marker"],
  });

  const [debug, setDebug] = useState<{ status: string; count: number; url?: string }>({
  status: "idle",
  count: 0,
});
  const topSafeOffset = "calc(env(safe-area-inset-top, 0px) + 12px)";
  const topOverlayOffset = "calc(env(safe-area-inset-top, 0px) + 88px)";

  const sfCenter = activeLocation;

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setUseProxy(false);
      },
      () => {
        // Keep proxy location when geolocation is unavailable/denied.
      },
    );
  }, []);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(activeLocation);

    binLocations.slice(0, 10).forEach((bin) => bounds.extend(bin.position));

    map.fitBounds(bounds, 80);

    const idleListener = google.maps.event.addListenerOnce(map, "idle", () => {
      const currentZoom = map.getZoom();
      if (currentZoom && currentZoom > 16) {
        map.setZoom(16);
      }
    });

    return () => {
      google.maps.event.removeListener(idleListener);
    };
  }, [map, isLoaded, activeLocation.lat, activeLocation.lng, binLocations]);

  const cycleProxy = () => {
    const idx = PROXY_LOCATIONS.findIndex((p) => p.key === proxyKey);
    const next = PROXY_LOCATIONS[(idx + 1) % PROXY_LOCATIONS.length];
    setProxyKey(next.key);
  };

  const filteredBins =
    selectedFilter === "all"
      ? binLocations
      : binLocations.filter((bin) => bin.type === selectedFilter);

  // ...existing code...

  useEffect(() => {
    if (!map || !isLoaded) return;

    const markers: google.maps.marker.AdvancedMarkerElement[] = [];

    const userEl = document.createElement("div");
    userEl.style.width = "24px";
    userEl.style.height = "24px";
    userEl.style.borderRadius = "50%";
    userEl.style.background = "#a855f7";
    userEl.style.border = "3px solid white";
    userEl.style.boxShadow = "0 6px 18px rgba(0,0,0,0.25)";

    const userMarker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: activeLocation,
      content: userEl,
      zIndex: 1000,
    });
    markers.push(userMarker);

    const makeBadge = (type: BinType) => {
      const el = document.createElement("div");
      el.style.width = "56px";
      el.style.height = "56px";
      el.style.borderRadius = "16px";
      el.style.display = "grid";
      el.style.placeItems = "center";
      el.style.border = "4px solid white";
      el.style.boxShadow = "0 10px 25px rgba(0,0,0,0.18)";
      el.style.cursor = "pointer";

      // Match sidebar: white icon when “active” style.
      // On map, we’ll always do colored background + white icon (clean).
      const bg =
        type === "recycle"
          ? "#3b82f6"
          : type === "compost"
          ? "#22c55e"
          : "#6b7280";

      el.style.background = bg;
      el.innerHTML = lucideSvg(type, "white");
      return el;
    };

    filteredBins.forEach((bin) => {
      const content = makeBadge(bin.type);
      content.addEventListener("click", () => setSelectedLocation(bin));

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: bin.position,
        content,
      });

      markers.push(marker);
    });


    // Cleanup function to remove all markers from the map
    return () => {
      markers.forEach((m) => (m.map = null));
    };
  }, [map, isLoaded, filteredBins, activeLocation.lat, activeLocation.lng]);

  useEffect(() => {
  const controller = new AbortController();

  async function loadNearby() {
    const lat = activeLocation.lat;
    const lng = activeLocation.lng;

    const API_BASE = import.meta.env.VITE_API_BASE_URL;

    // ✅ IMPORTANT: fallback so you don't build "undefined/..."
    const base = API_BASE?.trim() ? API_BASE.trim() : "";
    const url = `${base}/api/trashcans/nearby?lat=${lat}&lng=${lng}&limit=10&maxDistance=3000`;

    setDebug({ status: "loading", count: 0, url });

    const res = await fetch(url, { signal: controller.signal });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setDebug({ status: `error ${res.status}`, count: 0, url });
      return;
    }

    const items = (data.items ?? []) as any[];
    setBinLocations(
      items.map((x: any) => ({
        id: String(x.id),
        name: x.name ?? "Trash Can",
        type: (x.type ?? "trash") as BinType,
        address: x.address ?? "",
        position: x.position,
        distance: x.distance,
      })),
    );

    setDebug({ status: "ok", count: items.length, url });
  }

  loadNearby().catch((e) => {
    setDebug({ status: `fetch failed`, count: 0, url: String(e) });
  });

  return () => controller.abort();
}, [activeLocation.lat, activeLocation.lng]);

  
  const getBinIconUrl = (type: BinType) => {
    switch (type) {
      case "recycle":
        return "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"; // Blue for recycle
      case "compost":
        return "https://maps.google.com/mapfiles/ms/icons/green-dot.png"; // Green for compost
      case "trash":
        return "https://maps.google.com/mapfiles/ms/icons/gray-dot.png"; // Gray for trash
      default:
        return "https://maps.google.com/mapfiles/ms/icons/red-dot.png"; // Default red
    }
  };

  const getBinColor = (type: BinType) => {
    switch (type) {
      case "recycle":
        return "bg-blue-500";
      case "compost":
        return "bg-green-500";
      case "trash":
        return "bg-gray-500";
    }
  };

  const getBinBorderColor = (type: BinType) => {
    switch (type) {
      case "recycle":
        return "border-blue-500";
      case "compost":
        return "border-green-500";
      case "trash":
        return "border-gray-500";
    }
  };

  const openDirections = (dest: { lat: number; lng: number }) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`;
    window.open(url, "_blank");
  };

  const lucideSvg = (type: BinType, stroke: string) => {
    // These paths match Lucide icons (stroke-only). They’ll render like your sidebar.
    const paths =
      type === "recycle"
        ? `
        <path d="M7 19H4v-3"/>
        <path d="M4 16a8 8 0 0 1 13.657-5.657L20 12"/>
        <path d="M20 5v3h-3"/>
        <path d="M20 8a8 8 0 0 1-13.657 5.657L4 12"/>
      `
        : type === "compost"
        ? `
        <path d="M11 20A7 7 0 0 1 4 13C4 7 11 4 20 4c0 9-3 16-9 16Z"/>
        <path d="M20 4c-6 1-11 6-12 12"/>
      `
        : `
        <path d="M3 6h18"/>
        <path d="M8 6V4h8v2"/>
        <path d="M19 6l-1 14H6L5 6"/>
        <path d="M10 11v6"/>
        <path d="M14 11v6"/>
      `;

    return `
    <svg xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24" height="24"
      fill="none"
      stroke="${stroke}"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round">
      ${paths}
    </svg>
  `;
  };

  async function testPing() {
    try {
      const res = await EcoQuestVision.ping();
      alert(`Ping OK: ${res.message}`);
    } catch (e) {
      alert("Ping FAILED: " + String(e));
    }
  }

  return (
    <div className="w-full h-screen bg-gradient-to-b from-green-50 to-blue-50 overflow-hidden flex flex-col">
      {/* Container with max width for desktop */}
      <div className="relative w-full h-full flex-1 flex flex-col">
        {/* Full screen map */}

        <div className="absolute inset-0 z-0">
          {!isLoaded ? (
            <div className="w-full h-full bg-gray-100" />
          ) : (
            // Inside the GoogleMap component
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={sfCenter}
              zoom={13}
              onLoad={(m) => setMap(m)}
              options={{
                disableDefaultUI: true,
                clickableIcons: false,
                mapId: "6fdb0550dd266eb48a8a389c",
              }}
            >
              {/* Render markers only if the Google Maps API is loaded */}
            </GoogleMap>
          )}
        </div>

        {/* Top bar */}
        <div
          className="relative p-3 sm:p-4 z-20 pointer-events-none"
          style={{ paddingTop: topSafeOffset }}
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-3 sm:p-4 flex items-center justify-between pointer-events-auto">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">
                EcoQuest
              </h1>
              <p className="text-xs text-gray-600">San Francisco</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-right">
                <div className="text-xs sm:text-sm text-gray-600">
                  Level {mockUserStats.level}
                </div>
                <div className="text-base sm:text-lg font-bold text-green-600">
                  {mockUserStats.points}
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-xl sm:text-2xl">
                🦝
              </div>
            </div>
          </div>
        </div>

        <div
          className="absolute left-3 z-40 pointer-events-none"
          style={{ top: topOverlayOffset }}
        >
  <div className="bg-black/70 text-white text-xs rounded-xl px-3 py-2">
    <div>Status: {debug.status}</div>
    <div>Bins: {debug.count}</div>
  </div>
</div>


        {/* Filter buttons - Right side */}
        <div
          className="absolute right-3 sm:right-4 z-20 space-y-2 pointer-events-none"
          style={{ top: topOverlayOffset }}
        >
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
            onClick={() =>
              setSelectedFilter(
                selectedFilter === "recycle" ? "all" : "recycle",
              )
            }
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shadow-lg flex items-center justify-center border-2 transition-colors pointer-events-auto touch-manipulation ${
              selectedFilter === "recycle"
                ? "bg-blue-500 border-blue-600"
                : "bg-white border-gray-200"
            }`}
          >
            <Recycle
              size={20}
              className={`sm:w-6 sm:h-6 ${
                selectedFilter === "recycle" ? "text-white" : "text-blue-600"
              }`}
            />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() =>
              setSelectedFilter(
                selectedFilter === "compost" ? "all" : "compost",
              )
            }
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shadow-lg flex items-center justify-center border-2 transition-colors pointer-events-auto touch-manipulation ${
              selectedFilter === "compost"
                ? "bg-green-500 border-green-600"
                : "bg-white border-gray-200"
            }`}
          >
            <Leaf
              size={20}
              className={`sm:w-6 sm:h-6 ${
                selectedFilter === "compost" ? "text-white" : "text-green-600"
              }`}
            />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() =>
              setSelectedFilter(selectedFilter === "trash" ? "all" : "trash")
            }
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shadow-lg flex items-center justify-center border-2 transition-colors pointer-events-auto touch-manipulation ${
              selectedFilter === "trash"
                ? "bg-gray-500 border-gray-600"
                : "bg-white border-gray-200"
            }`}
          >
            <Trash2
              size={20}
              className={`sm:w-6 sm:h-6 ${
                selectedFilter === "trash" ? "text-white" : "text-gray-600"
              }`}
            />
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
              className="absolute right-3 sm:right-4 left-3 sm:left-4 bottom-24 z-30 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              style={{ top: topOverlayOffset }}
            >
              <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-500 to-green-600">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Nearby Locations
                </h2>
                <button
                  onClick={() => setShowLocationList(false)}
                  className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center touch-manipulation"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
                {filteredBins.map((bin) => {
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
                        isSelected
                          ? getBinBorderColor(bin.type)
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 sm:w-12 sm:h-12 ${getBinColor(
                            bin.type,
                          )} rounded-xl flex items-center justify-center flex-shrink-0`}
                        >
                          <img
                            src={getBinIconUrl(bin.type)}
                            alt={`${bin.type} icon`}
                            className="w-6 h-6 sm:w-8 sm:h-8"
                          />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="font-bold text-gray-800 text-sm sm:text-base">
                            {bin.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {bin.address}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {bin.distance} away
                          </p>
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
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 ${getBinColor(
                      selectedLocation.type,
                    )} rounded-xl flex items-center justify-center flex-shrink-0`}
                  >
                    <img
                      src={getBinIconUrl(selectedLocation.type)}
                      alt={`${selectedLocation.type} icon`}
                      className="w-6 h-6 sm:w-8 sm:h-8"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-base sm:text-lg truncate">
                      {selectedLocation.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                      {selectedLocation.address}
                    </p>
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
                <button
                  className="w-full mt-3 sm:mt-4 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg touch-manipulation text-sm sm:text-base"
                  onClick={() => openDirections(selectedLocation.position)}
                >
                  <Navigation size={20} />
                  Get Directions
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Test Ping Button - bottom center above Scan */}
        <div className="absolute bottom-36 sm:bottom-40 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={testPing}
            className="bg-black text-white px-5 py-2 rounded-full shadow-lg font-semibold pointer-events-auto touch-manipulation"
          >
            Test Ping
          </motion.button>
        </div>

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
              <span className="text-xs text-gray-700 font-medium">
                Hotspots
              </span>
            </div>
          </div>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
