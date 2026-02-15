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
  X,
} from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { mockUserStats } from "../data/mockData";
import { getStoredPoints } from "../data/points";
import { GoogleMap, useLoadScript } from "@react-google-maps/api";

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
  id: number | string;
  position: LatLng;
  itemCount: number;
  recentActivity: number;
}

type TrashReportResponse = {
  _id: string;
  location?: {
    coordinates?: [number, number];
  };
  severity?: number;
};

const BACKEND_URL_STORAGE_KEY = "ecoquest_backend_url";

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
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
  const [points, setPoints] = useState(() => getStoredPoints(mockUserStats.points));
  const [selectedFilter, setSelectedFilter] = useState<BinType | "all">("all");
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<BinLocation | null>(
    null,
  );
  const [showHotspotForm, setShowHotspotForm] = useState(false);
  const [isSubmittingHotspot, setIsSubmittingHotspot] = useState(false);
  const [hotspotSeverity, setHotspotSeverity] = useState(3);
  const [hotspotDescription, setHotspotDescription] = useState("");
  const [hotspotImageDataUrl, setHotspotImageDataUrl] = useState("");
  const [hotspotImageName, setHotspotImageName] = useState("");
  const [hotspotError, setHotspotError] = useState<string | null>(null);
  const [showAddBinForm, setShowAddBinForm] = useState(false);
  const [isSubmittingBin, setIsSubmittingBin] = useState(false);
  const [newBinType, setNewBinType] = useState<"Recycling" | "Compost" | "Trash">("Trash");
  const [newBinError, setNewBinError] = useState<string | null>(null);
  const [submittedBins, setSubmittedBins] = useState<
    Array<{ id: string; position: LatLng; type: BinType }>
  >([]);

  const [binLocations, setBinLocations] = useState<BinLocation[]>([]);

  // 1. Restore the backend URL state (required for ngrok)
  const envBackendBaseUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? "http://localhost:8080";
  const [backendBaseUrl, setBackendBaseUrl] = useState(() => {
    const saved = window.localStorage.getItem(BACKEND_URL_STORAGE_KEY);
    return normalizeBaseUrl(saved ?? envBackendBaseUrl);
  });

  // 2. Restore the hotspots state (so you don't crash the markers effect)
  const [cleanupHotspots, setCleanupHotspots] = useState<CleanupHotspot[]>([]);

  // 3. Define the report location (use the activeLocation so reports match your proxy)
  

  // For judging/demo, lock nearby-bin queries to Civic Center.
  const activeLocation =
    PROXY_LOCATIONS.find((p) => p.key === "civic") ?? PROXY_LOCATIONS[0];


  const reportLocation = activeLocation;
  
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["marker"],
  });

  const [debug, setDebug] = useState<{
    status: string;
    count: number;
    url?: string;
    lat?: number;
    lng?: number;
    httpStatus?: number;
    firstId?: string;
    error?: string;
  }>({
    status: "idle",
    count: 0,
  });
  const topSafeOffset = "calc(env(safe-area-inset-top, 0px) + 4px)";
  const topOverlayOffset = "calc(env(safe-area-inset-top, 0px) + 76px)";
  const reportButtonOffset = "calc(env(safe-area-inset-top, 0px) + 84px)";

  const sfCenter = activeLocation;

  useEffect(() => {
    const onFocus = () => setPoints(getStoredPoints(mockUserStats.points));
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onFocus);
    };
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

  const filteredBins =
    selectedFilter === "all"
      ? binLocations
      : binLocations.filter((bin) => bin.type === selectedFilter);

  useEffect(() => {
    window.localStorage.setItem(
      BACKEND_URL_STORAGE_KEY,
      normalizeBaseUrl(backendBaseUrl),
    );
    console.log("[bins] backendBaseUrl changed:", normalizeBaseUrl(backendBaseUrl));
  }, [backendBaseUrl]);

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

    const makeBadge = (type: BinType, borderColor = "white") => {
      const el = document.createElement("div");
      el.style.width = "56px";
      el.style.height = "56px";
      el.style.borderRadius = "16px";
      el.style.display = "grid";
      el.style.placeItems = "center";
      el.style.border = `4px solid ${borderColor}`;
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

    cleanupHotspots.forEach((hotspot) => {
      const el = document.createElement("div");
      el.style.width = "44px";
      el.style.height = "44px";
      el.style.borderRadius = "50%";
      el.style.background = "#f97316";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.boxShadow = "0 8px 20px rgba(0,0,0,0.2)";
      el.style.border = "3px solid white";
      el.style.fontWeight = "700";
      el.style.color = "white";
      el.innerText = `${hotspot.itemCount}`;

      markers.push(
        new google.maps.marker.AdvancedMarkerElement({
          map,
          position: hotspot.position,
          content: el,
          zIndex: 1100,
        }),
      );
    });

    submittedBins.forEach((bin) => {
      const content = makeBadge(bin.type, "#ef4444");
      markers.push(
        new google.maps.marker.AdvancedMarkerElement({
          map,
          position: bin.position,
          content,
          zIndex: 1050,
        }),
      );
    });


    // Cleanup function to remove all markers from the map
    return () => {
      markers.forEach((m) => (m.map = null));
    };
  }, [map, isLoaded, filteredBins, activeLocation.lat, activeLocation.lng, cleanupHotspots, submittedBins]);

  useEffect(() => {
  const controller = new AbortController();

  async function loadNearby() {
    const lat = activeLocation.lat;
    const lng = activeLocation.lng;

    const base = normalizeBaseUrl(backendBaseUrl);
    const query = `lat=${lat}&lng=${lng}&limit=10&maxDistance=3000`;
    const trashUrl = `${base}/api/trashcans/nearby-trash?${query}`;
    const compostUrl = `${base}/api/trashcans/nearby-compost?${query}`;
    const recycleUrl = `${base}/api/trashcans/nearby-recycle?${query}`;
    const urls =
      selectedFilter === "trash"
        ? [trashUrl]
        : selectedFilter === "compost"
        ? [compostUrl]
        : selectedFilter === "recycle"
        ? [recycleUrl]
        : selectedFilter === "all"
        ? [trashUrl, compostUrl, recycleUrl]
        : [];

    console.log("[bins] loadNearby start", { urls, lat, lng, selectedFilter });
    setDebug({ status: "loading", count: 0, url: urls.join(" | "), lat, lng });

    if (urls.length === 0) {
      setBinLocations([]);
      setDebug({
        status: "no route for selected filter",
        count: 0,
        url: "",
        lat,
        lng,
      });
      return;
    }

    const responses = await Promise.all(
      urls.map((url) =>
        fetch(url, {
          signal: controller.signal,
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        }),
      ),
    );

    const bodies = await Promise.all(
      responses.map(async (res) => {
        const rawText = await res.text();
        const contentType = res.headers.get("content-type") ?? "";
        const data = (() => {
          try {
            return rawText ? JSON.parse(rawText) : {};
          } catch {
            return {};
          }
        })();
        return { res, rawText, contentType, data };
      }),
    );

    const firstBad = bodies.find((b) => !b.res.ok || !b.contentType.includes("application/json"));
    if (firstBad) {
      const status = firstBad.res.status;
      const errText = firstBad.rawText.slice(0, 240);
      setDebug({
        status: `error ${status}`,
        count: 0,
        url: urls.join(" | "),
        lat,
        lng,
        httpStatus: status,
        error: errText,
      });
      return;
    }

    const items = bodies.flatMap((b: any) => (b.data.items ?? []) as any[]);
    const mapped = items
      .map((x: any) => ({
        id: String(x.id),
        name: x.name ?? "Trash Can",
        type: (x.type ?? "trash") as BinType,
        address: x.address ?? "",
        position: x.position,
        distance: x.distance,
      }));

    const unique = Array.from(new Map(mapped.map((x) => [x.id, x])).values());
    const topTenForFilter = unique.slice(0, 10);

    setBinLocations(topTenForFilter);

    setDebug({
      status: "ok",
      count: topTenForFilter.length,
      url: urls.join(" | "),
      lat,
      lng,
      httpStatus: responses[0]?.status,
      firstId: topTenForFilter[0]?.id ? String(topTenForFilter[0].id) : undefined,
    });
  }

  loadNearby().catch((e) => {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[bins] loadNearby fetch failed", msg);
    setDebug({ status: "fetch failed", count: 0, error: msg });
  });

  return () => controller.abort();
}, [activeLocation.lat, activeLocation.lng, backendBaseUrl, selectedFilter]);

  
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

  async function testBackendConnection() {
    const endpoint = `${normalizeBaseUrl(backendBaseUrl)}/health`;
    try {
      const res = await fetch(endpoint, {
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
      });
      const text = await res.text();
      alert(`Backend check: ${res.status}\n${endpoint}\n${text}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Backend check failed: ${msg}\n${endpoint}`);
    }
  }

  function openHotspotForm() {
    setHotspotError(null);
    setShowHotspotForm(true);
  }

  function closeHotspotForm() {
    if (isSubmittingHotspot) return;
    setShowHotspotForm(false);
    setHotspotError(null);
  }

  function openAddBinForm() {
    setNewBinError(null);
    setShowAddBinForm(true);
  }

  function closeAddBinForm() {
    if (isSubmittingBin) return;
    setShowAddBinForm(false);
    setNewBinError(null);
  }

  async function onHotspotImageChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) {
      setHotspotImageDataUrl("");
      setHotspotImageName("");
      return;
    }

    setHotspotImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setHotspotImageDataUrl(String(reader.result ?? ""));
    };
    reader.onerror = () => {
      setHotspotImageDataUrl("");
      setHotspotImageName("");
      setHotspotError("Could not read selected image.");
    };
    reader.readAsDataURL(file);
  }

  async function submitHotspotReport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setHotspotError(null);

    if (!hotspotDescription.trim()) {
      setHotspotError("Description is required.");
      return;
    }

    if (!Number.isFinite(hotspotSeverity) || hotspotSeverity < 1 || hotspotSeverity > 5) {
      setHotspotError("Severity must be a number between 1 and 5.");
      return;
    }

    setIsSubmittingHotspot(true);
    try {
      const resolvedBackendBaseUrl = normalizeBaseUrl(backendBaseUrl);
      const payload = {
        severity: hotspotSeverity,
        description: hotspotDescription.trim(),
        ...(hotspotImageDataUrl ? { imageUrl: hotspotImageDataUrl } : {}),
        location: {
          type: "Point",
          coordinates: [reportLocation.lng, reportLocation.lat] as [number, number],
        },
      };

      const endpoint = `${resolvedBackendBaseUrl}/api/trash-reports`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Request failed (${res.status}) ${text}`);
      }

      const created = (await res.json()) as TrashReportResponse;
      setCleanupHotspots((prev) => [
        ...prev,
        {
          id: created._id ?? Date.now(),
          position: { lat: reportLocation.lat, lng: reportLocation.lng },
          itemCount: created.severity ?? hotspotSeverity,
          recentActivity: 1,
        },
      ]);

      setShowHotspotForm(false);
      setHotspotSeverity(3);
      setHotspotDescription("");
      setHotspotImageDataUrl("");
      setHotspotImageName("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setHotspotError(
        `Failed to report hotspot: ${msg}. URL: ${backendBaseUrl}/api/trash-reports`,
      );
    } finally {
      setIsSubmittingHotspot(false);
    }
  }

  async function submitNewBin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNewBinError(null);
    setIsSubmittingBin(true);

    try {
      const resolvedBackendBaseUrl = normalizeBaseUrl(backendBaseUrl);
      const payload = {
        location: {
          type: "Point",
          coordinates: [reportLocation.lng, reportLocation.lat] as [number, number],
        },
        type: newBinType,
        status: "Pending",
        verificationCount: 0,
        addedBy: "demo-user",
      };

      const endpoint = `${resolvedBackendBaseUrl}/api/bins`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Request failed (${res.status}) ${text}`);
      }

      const created = (await res.json()) as {
        _id?: string;
        location?: { coordinates?: [number, number] };
        type?: "Recycling" | "Compost" | "Trash";
      };

      const mappedType: BinType =
        (created.type ?? newBinType) === "Recycling"
          ? "recycle"
          : (created.type ?? newBinType) === "Compost"
          ? "compost"
          : "trash";

      setBinLocations((prev) => [
        ...prev,
        {
          id: created._id ?? String(Date.now()),
          name: `${created.type ?? newBinType} Bin`,
          type: mappedType,
          address: "User-submitted bin",
          position: {
            lat: reportLocation.lat,
            lng: reportLocation.lng,
          },
        },
      ]);
      setSubmittedBins((prev) => [
        ...prev,
        {
          id: created._id ?? String(Date.now()),
          type: mappedType,
          position: { lat: reportLocation.lat, lng: reportLocation.lng },
        },
      ]);

      setShowAddBinForm(false);
      setNewBinType("Trash");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setNewBinError(`Failed to add bin: ${msg}. URL: ${backendBaseUrl}/api/bins`);
    } finally {
      setIsSubmittingBin(false);
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
                  {points}
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-xl sm:text-2xl">
                🦝
              </div>
            </div>
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

        {/* Report Hotspot Button - Top left */}
        <div
          className="absolute left-3 sm:left-4 z-20 pointer-events-none flex flex-col items-start"
          style={{ top: reportButtonOffset }}
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={openHotspotForm}
            className="bg-orange-500 text-white px-3 sm:px-4 py-2 rounded-xl text-sm sm:text-base shadow-lg font-semibold pointer-events-auto touch-manipulation"
          >
            Report Hotspot
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={openAddBinForm}
            className="mt-2 bg-orange-500 text-white px-3 sm:px-4 py-2 rounded-xl text-sm sm:text-base shadow-lg font-semibold pointer-events-auto touch-manipulation"
          >
            Add New Bin
          </motion.button>
        </div>

        {/* Selected location card */}
        <AnimatePresence>
          {selectedLocation && (
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

        {/* Report Hotspot Form */}
        <AnimatePresence>
          {showHotspotForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/40 backdrop-blur-[2px] px-3 py-6 sm:p-4 flex items-center justify-center"
            >
              <motion.form
                initial={{ y: 50, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 40, opacity: 0, scale: 0.98 }}
                transition={{ type: "spring", damping: 24, stiffness: 260 }}
                onSubmit={submitHotspotReport}
                className="w-full max-w-lg max-h-[86vh] mt-28 sm:mt-32 bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 sm:p-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-white font-bold text-lg sm:text-xl">Report Hotspot</h2>
                    <p className="text-white/90 text-xs sm:text-sm">Submit details in one form</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeHotspotForm}
                    className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center"
                  >
                    <X size={18} className="text-white" />
                  </button>
                </div>

                <div className="p-4 sm:p-5 space-y-4 max-h-[68vh] overflow-y-auto">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Backend URL</label>
                    <div className="flex gap-2">
                      <input
                        value={backendBaseUrl}
                        onChange={(e) => setBackendBaseUrl(e.target.value)}
                        className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        placeholder="https://your-tunnel.ngrok-free.dev"
                      />
                      <button
                        type="button"
                        onClick={testBackendConnection}
                        className="px-3 py-2 rounded-xl bg-slate-700 text-white text-sm font-semibold"
                      >
                        Test
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Severity (1-5)</label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={hotspotSeverity}
                      onChange={(e) => setHotspotSeverity(Number(e.target.value))}
                      className="w-full accent-orange-500"
                    />
                    <div className="text-sm font-bold text-orange-600 mt-1">Level {hotspotSeverity}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                    <textarea
                      value={hotspotDescription}
                      onChange={(e) => setHotspotDescription(e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      placeholder="Example: Huge pile of boxes and litter near the curb."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Optional Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onHotspotImageChange}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-1.5 file:text-orange-700"
                    />
                    {hotspotImageName && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{hotspotImageName}</p>
                    )}
                    {hotspotImageDataUrl && (
                      <img
                        src={hotspotImageDataUrl}
                        alt="Selected hotspot"
                        className="mt-2 w-full h-32 object-cover rounded-xl border border-gray-200"
                      />
                    )}
                  </div>

                  {hotspotError && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                      {hotspotError}
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-5 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={isSubmittingHotspot}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-bold shadow-lg disabled:opacity-60"
                  >
                    {isSubmittingHotspot ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add New Bin Form */}
        <AnimatePresence>
          {showAddBinForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/40 backdrop-blur-[2px] px-3 py-6 sm:p-4 flex items-center justify-center"
            >
              <motion.form
                initial={{ y: 50, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 40, opacity: 0, scale: 0.98 }}
                transition={{ type: "spring", damping: 24, stiffness: 260 }}
                onSubmit={submitNewBin}
                className="w-full max-w-lg max-h-[86vh] mt-20 sm:mt-24 bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 sm:p-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-white font-bold text-lg sm:text-xl">Add New Bin</h2>
                    <p className="text-white/90 text-xs sm:text-sm">Submit a crowdsourced bin</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeAddBinForm}
                    className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center"
                  >
                    <X size={18} className="text-white" />
                  </button>
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Backend URL</label>
                    <div className="flex gap-2">
                      <input
                        value={backendBaseUrl}
                        onChange={(e) => setBackendBaseUrl(e.target.value)}
                        className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        placeholder="https://your-tunnel.ngrok-free.dev"
                      />
                      <button
                        type="button"
                        onClick={testBackendConnection}
                        className="px-3 py-2 rounded-xl bg-slate-700 text-white text-sm font-semibold"
                      >
                        Test
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Bin Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["Recycling", "Compost", "Trash"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setNewBinType(type)}
                          className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                            newBinType === type
                              ? "border-orange-600 bg-orange-600 text-white"
                              : "border-gray-300 bg-white text-gray-700"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {newBinError && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                      {newBinError}
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-5 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={isSubmittingBin}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-bold shadow-lg disabled:opacity-60"
                  >
                    {isSubmittingBin ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Scan Button */}
        <div className="absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/scan")}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-green-600 text-white shadow-2xl border-4 border-white pointer-events-auto touch-manipulation flex items-center justify-center"
          >
            <Camera size={34} className="sm:w-10 sm:h-10" />
          </motion.button>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
