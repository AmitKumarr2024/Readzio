import fs from "fs/promises";
import path from "path";
import { schedule } from "node-cron";
import logger from "../../servers/Utils/Logger.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, "../temp");

export const startTempCleanup = () => {
  schedule(
    "0 0 * * *",
    async () => {
      try {
        const dirExists = await fs
          .access(tempDir)
          .then(() => true)
          .catch(() => false);
        if (!dirExists) {
          logger.info("[Cleanup] Temp directory does not exist", { tempDir });
          return;
        }

        const files = await fs.readdir(tempDir);
        for (const file of files) {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);
          const now = Date.now();
          const age = now - stats.mtimeMs;

          if (age > 24 * 60 * 60 * 1000) {
            await fs.unlink(filePath);
            logger.info("[Cleanup] Deleted old temp file", { filePath });
          }
        }
      } catch (error) {
        logger.error("[Cleanup] Error in temp file cleanup", {
          message: error.message,
          stack: error.stack,
        });
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );
};
