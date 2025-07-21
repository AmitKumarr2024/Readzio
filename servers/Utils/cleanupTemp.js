import fs from "fs";
import path from "path";
import { schedule } from "node-cron";
import logger from "./Logger.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, "../temp");

export const startTempCleanup = () => {
  schedule("0 0 * * *", () => {
    if (fs.existsSync(tempDir)) {
      fs.readdirSync(tempDir).forEach((file) => {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        const now = Date.now();
        const age = now - stats.mtimeMs;
        if (age > 24 * 60 * 60 * 1000) {
          fs.unlinkSync(filePath);
          logger.info("[Cleanup] Deleted old temp file", { filePath });
        }
      });
    }
  });
};