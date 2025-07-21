// utils/processBlock.js

import { AppError } from "../../servers/Utils/AppError.js";
import { uploadToCloudinary } from "./uploadToCloudinary.js";
import sharp from "sharp";
import axios from "axios";

// Helpers
const isBase64Image = (src) => /^data:image\/(jpeg|png|webp);base64,/.test(src);
const isHttpURL = (src) => /^https?:\/\//.test(src);

// Allowed fields to store in DB
const allowedFields = new Set([
  "id", "type", "status", "value", "level", "text", "code", "caption",
  "src", "href", "url", "name", "size", "ordered", "author",
  "question", "options", "votedUserIds", "items", "data",
]);

export const processBlock = async (block) => {
  const processed = {
    ...block,
    id: block.id,
    status: block.status || "draft",
  };

  // 🖼️ Handle image block
  if (block.type === "image" && block.src) {
    try {
      if (isBase64Image(block.src)) {
        const result = await uploadToCloudinary({
          base64: block.src,
          folder: "blogs/post/blocks/images/",
        });
        processed.src = result.secure_url;
      } else if (isHttpURL(block.src)) {
        const response = await axios.get(block.src, { responseType: "arraybuffer" });
        const buffer = Buffer.from(response.data, "binary");

        const image = sharp(buffer);
        const metadata = await image.metadata();

        if (metadata.width > 1200) image.resize({ width: 1200 });

        const compressedBuffer = await image
          .jpeg({ quality: 80, mozjpeg: true })
          .toBuffer();

        const result = await uploadToCloudinary({
          buffer: compressedBuffer,
          folder: "blogs/post/blocks/images/",
        });
        processed.src = result.secure_url;
      }
    } catch (err) {
      console.error("[processBlock:image] Failed:", err.message);
      throw new AppError("Failed to process image block", 400, "processBlock");
    }
  }

  // 📊 Handle poll block
  if (block.type === "poll") {
    if (!block.question || !Array.isArray(block.options)) {
      throw new AppError("Poll block must have a question and options array", 400, "processBlock");
    }

    processed.options = block.options.map((opt) =>
      typeof opt === "string"
        ? { option: opt, votes: 0 }
        : { option: opt.option, votes: opt.votes || 0 }
    );

    processed.votedUserIds = block.votedUserIds || [];
  }

  // ✅ Handle list block
  if (block.type === "list" && Array.isArray(block.items)) {
    processed.items = block.items.map((item) => (item == null ? "" : String(item)));
  }

  // 🧼 Clean unwanted fields
  Object.keys(processed).forEach((key) => {
    if (!allowedFields.has(key)) {
      delete processed[key];
    }
  });

  return processed;
};
