import multer from "multer";
import path from "path";
import { AppError } from "../../servers/Utils/AppError.js";

// ✅ diskStorage — for local uploads (used by other parts)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Ensure "uploads" folder exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// ✅ memoryStorage — for Cloudinary uploads (buffer-based)
const memoryStorage = multer.memoryStorage();

// ✅ File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "Invalid file type",
        400,
        "UploadMiddleware",
        "Only image files are allowed"
      ),
      false
    );
  }
};

// ✅ Smart upload selector:
//    If you set `req.useMemoryStorage = true` before upload,
//    it’ll use memory (Cloudinary). Otherwise it defaults to disk.
const dynamicStorage = {
  _handleFile(req, file, cb) {
    const selectedStorage = req.useMemoryStorage ? memoryStorage : diskStorage;
    return selectedStorage._handleFile(req, file, cb);
  },
  _removeFile(req, file, cb) {
    const selectedStorage = req.useMemoryStorage ? memoryStorage : diskStorage;
    return selectedStorage._removeFile(req, file, cb);
  },
};

// ✅ Initialize Multer
const upload = multer({
  storage: dynamicStorage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

export default upload;
