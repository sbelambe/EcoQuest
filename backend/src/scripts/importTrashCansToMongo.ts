import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { MongoClient } from "mongodb";

/**
 * Import SF trash cans (clean CSV) into MongoDB Atlas.
 *
 * Expected CSV columns:
 * - clean_latitude
 * - clean_longitude
 * - objectcode (preferred unique id) OR objectid/globalid fallback
 * - plus any other columns (stored under properties)
 *
 * Writes documents like:
 * {
 *   source: "datasf-trash-can-locations",
 *   sourceId: "datasf:CAN-2337665",
 *   name: "Trash Can",
 *   address: "...",
 *   location: { type:"Point", coordinates:[lng,lat] },
 *   properties: { ...all csv columns... },
 *   updatedAt: Date
 * }
 */

const SOURCE = "datasf-trash-can-locations";

const INPUT_CSV_PATH =
  process.env.TRASH_CANS_CLEAN_CSV_PATH ||
  path.resolve(process.cwd(), "data", "trash_clean.csv");

const DB_NAME = process.env.MONGODB_DB || "ecoquest";
const COLLECTION_NAME = process.env.MONGODB_COLLECTION || "trash-cans";

function toNumber(v: any): number | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function inSFBbox(lat: number, lng: number) {
  // Wide sanity bounds around SF
  return lat >= 37.6 && lat <= 37.9 && lng >= -122.55 && lng <= -122.35;
}

function pickAddress(row: Record<string, any>) {
  const objectdesc = String(row.objectdescription || "").trim(); // often "2001 HAYES ST"
  const onstreet = String(row.onstreet || "").trim();
  const fromstreet = String(row.fromstreet || "").trim();
  const streetcorner = String(row.streetcorner || "").trim();

  return (
    objectdesc ||
    [onstreet, fromstreet].filter(Boolean).join(" & ") ||
    streetcorner ||
    ""
  );
}

function normalizeCanColor(row: Record<string, any>) {
  return String(row.cancolor || row.canColor || "")
    .trim()
    .toLowerCase();
}

function mapTypeFromCanColor(
  canColor: string,
): "trash" | "recycle" | "compost" {
  if (canColor === "blue") return "recycle";
  if (canColor === "green") return "compost";
  return "trash";
}

function pickSourceId(row: Record<string, any>) {
  const objectcode = String(row.objectcode || "").trim();
  if (objectcode) return `datasf:${objectcode}`;

  const globalid = String(row.globalid || "").trim();
  if (globalid) return `datasf:globalid:${globalid}`;

  const objectid = String(row.objectid || "").trim();
  if (objectid) return `datasf:objectid:${objectid}`;

  return null;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI in backend/.env");

  if (!fs.existsSync(INPUT_CSV_PATH)) {
    throw new Error(
      `Clean CSV not found at ${INPUT_CSV_PATH}. Set TRASH_CANS_CLEAN_CSV_PATH or place file at data/trash_clean.csv`,
    );
  }

  console.log("CSV:", INPUT_CSV_PATH);
  const csvText = fs.readFileSync(INPUT_CSV_PATH, "utf8");

  const records: Record<string, any>[] = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log("Rows in CSV:", records.length);

  const client = new MongoClient(uri);
  await client.connect();
  console.log("Connected to MongoDB");

  const db = client.db(DB_NAME);
  const col = db.collection(COLLECTION_NAME);

  // Create indexes (safe to call repeatedly)
  await col.createIndex({ sourceId: 1 }, { unique: true });
  await col.createIndex({ location: "2dsphere" });
  await col.createIndex({ source: 1 });

  let kept = 0;
  let skippedNoCoords = 0;
  let skippedBadCoords = 0;
  let skippedNoId = 0;

  const bulkOps: any[] = [];

  for (const row of records) {
    // Prefer clean_latitude/clean_longitude (from your cleaning script)
    const lat = toNumber(row.clean_latitude ?? row.latitude);
    const lng = toNumber(row.clean_longitude ?? row.longitude);

    if (lat === null || lng === null) {
      skippedNoCoords++;
      continue;
    }
    if (!inSFBbox(lat, lng)) {
      skippedBadCoords++;
      continue;
    }

    const sourceId = pickSourceId(row);
    if (!sourceId) {
      skippedNoId++;
      continue;
    }

    const address = pickAddress(row);
    const canColor = normalizeCanColor(row);
    const type = mapTypeFromCanColor(canColor);

    const doc = {
      source: SOURCE,
      sourceId,
      name:
        type === "recycle"
          ? "Recycling Bin"
          : type === "compost"
          ? "Compost Bin"
          : "Trash Can",
      address,
      canColor,
      type,
      location: { type: "Point", coordinates: [lng, lat] as [number, number] },
      properties: row, // keep full row for future use
      updatedAt: new Date(),
    };

    bulkOps.push({
      updateOne: {
        filter: { sourceId },
        update: { $set: doc },
        upsert: true,
      },
    });

    kept++;

    if (bulkOps.length >= 1000) {
      await col.bulkWrite(bulkOps, { ordered: false });
      bulkOps.length = 0;
      console.log("Imported:", kept);
    }
  }

  if (bulkOps.length) {
    await col.bulkWrite(bulkOps, { ordered: false });
  }

  console.log("Done ✅");
  console.log({ kept, skippedNoCoords, skippedBadCoords, skippedNoId });

  // Optional: quick count
  const total = await col.countDocuments({ source: SOURCE });
  console.log("Total docs in collection for this source:", total);

  await client.close();
}

main().catch((e) => {
  console.error("Import failed:", e);
  process.exit(1);
});
