import multer from "multer";
import path from "path";
import fs from "fs";
import { AppError } from "../../servers/Utils/AppError.js";

// Ensure uploads directory exists
const uploadDir = path.resolve("uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Filters for image files only
const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "Invalid file type",
        400,
        "UploadMiddleware",
        "Only image files are allowed"
      )
    );
  }
};

// Initializes Multer with storage, file filter, and size limit
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// ✅ Export reusable upload middlewares
export const uploadSingleImage = (fieldName = "image") =>
  upload.single(fieldName);
export const uploadMultipleImages = (fieldName = "images", maxCount = 5) =>
  upload.array(fieldName, maxCount);

export default upload;
