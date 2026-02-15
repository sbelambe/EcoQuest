import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

// ---- CONFIG ----
const INPUT_CSV_PATH =
  process.env.TRASH_CANS_CSV_PATH ||
  path.resolve(process.cwd(), "data", "sf_trash_cans.csv");

const OUTPUT_CSV_PATH =
  process.env.TRASH_CANS_CLEAN_CSV_PATH ||
  path.resolve(process.cwd(), "data", "trash_clean.csv");

function toNumber(v: any): number | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Parses: "POINT (-122.447948 37.773811)" => { lng, lat }
function parsePointWkt(point: any): { lat: number; lng: number } | null {
  if (!point) return null;
  const s = String(point).trim();
  const m = s.match(/POINT\s*\(\s*(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)\s*\)/i);
  if (!m) return null;

  const lng = Number(m[1]);
  const lat = Number(m[3]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
}

function normalizeLatLng(row: Record<string, any>) {
  const lat = toNumber(row.latitude);
  const lng = toNumber(row.longitude);

  if (lat !== null && lng !== null) return { lat, lng };

  // fallback to WKT point if lat/lng missing
  const wkt = parsePointWkt(row.point);
  if (wkt) return wkt;

  return null;
}

function inSFBbox(lat: number, lng: number) {
  // Wide sanity bounds around SF proper
  return lat >= 37.60 && lat <= 37.90 && lng >= -122.55 && lng <= -122.35;
}

function csvEscape(value: any): string {
  // RFC4180-ish CSV escaping
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows: Record<string, any>[], header: string[]): string {
  const lines: string[] = [];
  lines.push(header.map(csvEscape).join(","));
  for (const r of rows) {
    lines.push(header.map((h) => csvEscape(r[h])).join(","));
  }
  return lines.join("\n") + "\n";
}

async function main() {
  if (!fs.existsSync(INPUT_CSV_PATH)) {
    throw new Error(
      `Input CSV not found at ${INPUT_CSV_PATH}. Set TRASH_CANS_CSV_PATH.`
    );
  }

  console.log("Reading CSV:", INPUT_CSV_PATH);
  const csvText = fs.readFileSync(INPUT_CSV_PATH, "utf8");

  const records: Record<string, any>[] = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log("Rows in input CSV:", records.length);

  let kept = 0;
  let skippedNoCoords = 0;
  let skippedBadCoords = 0;

  const cleaned: Record<string, any>[] = [];

  for (const row of records) {
    const coords = normalizeLatLng(row);
    if (!coords) {
      skippedNoCoords++;
      continue;
    }
    if (!inSFBbox(coords.lat, coords.lng)) {
      skippedBadCoords++;
      continue;
    }

    // Create a clean row that preserves original fields + adds clean fields
    const cleanRow: Record<string, any> = { ...row };

    // Normalize to consistent decimals (optional)
    const cleanLat = Number(coords.lat.toFixed(6));
    const cleanLng = Number(coords.lng.toFixed(6));

    cleanRow.clean_latitude = cleanLat;
    cleanRow.clean_longitude = cleanLng;
    cleanRow.clean_point = `POINT (${cleanLng} ${cleanLat})`;

    // Optional: ensure objectcode exists (still keep row even if missing, your call)
    // If you want to drop missing objectcode rows, uncomment:
    // const objectcode = String(row.objectcode || "").trim();
    // if (!objectcode) continue;

    cleaned.push(cleanRow);
    kept++;
  }

  // Build header: original headers + new clean columns (in a stable order)
  const originalHeader = records.length ? Object.keys(records[0] as Record<string, any>) : [];
  const extraHeader = ["clean_latitude", "clean_longitude", "clean_point"];
  const header = [...originalHeader, ...extraHeader.filter((h) => !originalHeader.includes(h))];

  // Ensure output folder exists
  fs.mkdirSync(path.dirname(OUTPUT_CSV_PATH), { recursive: true });

  const outCsv = rowsToCsv(cleaned, header);
  fs.writeFileSync(OUTPUT_CSV_PATH, outCsv, "utf8");

  console.log("Wrote cleaned CSV:", OUTPUT_CSV_PATH);
  console.log({ kept, skippedNoCoords, skippedBadCoords });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
