import multer from "multer";
import path from "path";
import { AppError } from "../../servers/Utils/AppError.js";

// Configure disk storage (unused, but kept for reference)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("📁 Storage destination called:", "uploads/");
    cb(null, "uploads/"); // temp folder, make sure this exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    console.log("💾 Generating filename:", filename);
    cb(null, filename);
  },
});

// Filters for image files only
const fileFilter = (req, file, cb) => {
  console.log("🔍 Filtering file:", {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  });

  if (file.mimetype.startsWith("image/")) {
    console.log("✅ File accepted: Valid image type");
    cb(null, true);
  } else {
    console.log("❌ File rejected: Invalid type", { mimetype: file.mimetype });
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

// Initializes Multer with storage, file filter, and size limit
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

console.log("🚀 Multer middleware initialized with memory storage, 20MB limit");

export default upload;
