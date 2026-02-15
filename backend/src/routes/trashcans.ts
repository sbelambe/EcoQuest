import { Router } from "express";
import { z } from "zod";
import { MongoClient } from "mongodb";

const router = Router();

const QuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  limit: z.coerce.number().optional().default(10),
  maxDistance: z.coerce.number().optional().default(1500), // meters
});

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || "ecoquest";
const collectionName = process.env.MONGODB_COLLECTION || "trash-cans";

let client: MongoClient | null = null;

async function getCollection() {
  if (!uri) throw new Error("Missing MONGODB_URI");
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  const col = client.db(dbName).collection(collectionName);

  // ⚠️ Prefer doing this once at server startup, but ok for now.
  await col.createIndex({ location: "2dsphere" });

  return col;
}

type BinType = "trash" | "recycle" | "compost";

function inferType(d: any): BinType {
  const storedType = String(d?.type ?? "").toLowerCase().trim();
  if (storedType === "trash" || storedType === "recycle" || storedType === "compost") {
    return storedType as BinType;
  }

  const cancolor = String(d?.canColor ?? d?.properties?.cancolor ?? "")
    .toLowerCase()
    .trim();

  if (cancolor === "blue") return "recycle";
  if (cancolor === "green") return "compost";
  return "trash";
}

function docToItem(d: any) {
  const coords = d?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) return null;

  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const type = inferType(d);
  const cancolor = String(d?.canColor ?? d?.properties?.cancolor ?? "")
    .toLowerCase()
    .trim();

  return {
    id: d.sourceId ?? String(d._id),
    name: type === "recycle" ? "Recycling Bin" : type === "compost" ? "Compost Bin" : "Trash Can",
    type,
    address: d.address ?? d?.properties?.objectdescription ?? "",
    position: { lat, lng },
    coordinates: [lng, lat],
    cancolor,
  };
}

async function findNearbyByType(params: {
  lat: number;
  lng: number;
  limit: number;
  maxDistance: number;
  type: BinType;
}) {
  const { lat, lng, limit, maxDistance, type } = params;
  const col = await getCollection();

  // Filter logic:
  // - Prefer explicit `type` field
  // - Fallback to canColor for datasets where type isn't set yet
  const matchByTypeOrColor =
    type === "recycle"
      ? { $or: [{ type: "recycle" }, { canColor: "blue" }, { "properties.cancolor": "blue" }] }
      : type === "compost"
      ? { $or: [{ type: "compost" }, { canColor: "green" }, { "properties.cancolor": "green" }] }
      : {
          $or: [
            { type: "trash" },
            // “trash” is default fallback: not blue/green
            {
              $and: [
                { type: { $nin: ["recycle", "compost"] } },
                { canColor: { $nin: ["blue", "green"] } },
              ],
            },
          ],
        };

  const docs = await col
    .find({
      ...matchByTypeOrColor,
      // ensure docs are valid geo points
      "location.type": "Point",
      "location.coordinates.0": { $type: "number" },
      "location.coordinates.1": { $type: "number" },
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: maxDistance,
        },
      },
    })
    .limit(limit)
    .toArray();

  return docs.map(docToItem).filter(Boolean);
}

// -------- ROUTES --------

// 1) Top N closest trash cans
router.get("/nearby-trash", async (req, res) => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  const { lat, lng, limit, maxDistance } = parsed.data;

  try {
    const items = await findNearbyByType({
      lat,
      lng,
      limit,
      maxDistance,
      type: "trash",
    });
    res.json({ items });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "Server error", message: String(e?.message ?? e) });
  }
});

// 2) Top N closest compost bins
router.get("/nearby-compost", async (req, res) => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  const { lat, lng, limit, maxDistance } = parsed.data;

  try {
    const items = await findNearbyByType({
      lat,
      lng,
      limit,
      maxDistance,
      type: "compost",
    });
    res.json({ items });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "Server error", message: String(e?.message ?? e) });
  }
});

// 3) Top N closest recycle bins
router.get("/nearby-recycle", async (req, res) => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  const { lat, lng, limit, maxDistance } = parsed.data;

  try {
    const items = await findNearbyByType({
      lat,
      lng,
      limit,
      maxDistance,
      type: "recycle",
    });
    res.json({ items });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "Server error", message: String(e?.message ?? e) });
  }
});

export default router;
