import dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: Number(process.env.PORT ?? 8080),
  MONGODB_URI: process.env.MONGODB_URI ?? "",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};
