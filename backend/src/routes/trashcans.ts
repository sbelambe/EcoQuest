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
  return client.db(dbName).collection(collectionName);
}

router.get("/nearby", async (req, res) => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid query params. Use lat, lng, optional limit, maxDistance",
      details: parsed.error.flatten(),
    });
  }

  const { lat, lng, limit, maxDistance } = parsed.data;

  try {
    const col = await getCollection();

    // Geo query: requires location 2dsphere index + GeoJSON field
    const docs = await col
      .find({
        location: {
          $near: {
            $geometry: { type: "Point", coordinates: [lng, lat] },
            $maxDistance: maxDistance,
          },
        },
      })
      .limit(limit)
      .toArray();

    // Map to frontend BinLocation shape
    const items = docs.map((d: any) => {
      const cancolor = String(d?.properties?.cancolor || "").toLowerCase().trim();

      const type = cancolor === "blue" ? ("recycle" as const) : ("trash" as const);

      return {
        id: d.sourceId ?? String(d._id),
        name: type === "recycle" ? "Recycling Bin" : "Trash Can",
        type,
        address: d.address ?? d?.properties?.objectdescription ?? "",
        position: {
          lat: d.location.coordinates[1],
          lng: d.location.coordinates[0],
        },
        // include cancolor for debugging / styling
        cancolor,
      };
    });

    res.json({ items });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "Server error", message: String(e?.message ?? e) });
  }
});

export default router;
