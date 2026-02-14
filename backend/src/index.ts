import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { connectDb } from "./config/db.js";
import { healthRouter } from "./routes/health.js";

async function main() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: "10mb" })); // for base64 images if needed

  // http://localhost:8080/health
  app.use(healthRouter);

  await connectDb();

  app.listen(env.PORT, () => {
    console.log(`Backend listening on http://localhost:${env.PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
