import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { connectDb } from "./config/db.js";
import { healthRouter } from "./routes/health.js";
import { binRouter } from "./routes/binroutes.js";
import { trashReportRouter } from "./routes/trashreportroutes.js";
import { userRouter } from "./routes/userroutes.js";
import trashcansRouter from "./routes/trashcans.js";


async function main() {
  const app = express();

  app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
  app.use(express.json({ limit: "10mb" })); // for base64 images if needed
  app.use("/api/bins", binRouter);
  app.use("/api/trash-reports", trashReportRouter);
  app.use("/api/users", userRouter);
  
  app.use("/api/trashcans", trashcansRouter);


  // http://localhost:8080/health
  app.use(healthRouter);

  await connectDb();

  app.listen(env.PORT, "0.0.0.0", () => {
    console.log(`API listening on http://0.0.0.0:${env.PORT}`);
  });

}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
