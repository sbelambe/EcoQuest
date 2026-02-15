import dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: Number(process.env.PORT ?? 8080),
  MONGODB_URI: process.env.MONGODB_URI ?? "",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  
  IBM_BIN_QUEST_URL: process.env.IBM_BIN_QUEST_URL,
  IBM_TRASH_REPORT_URL: process.env.IBM_TRASH_REPORT_URL,
  IBM_CARBON_REPORT_URL: process.env.IBM_CARBON_REPORT_URL,
};
