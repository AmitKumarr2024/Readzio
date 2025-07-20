import multer from "multer";
import { AppError } from "../utils/AppError.js";

// Configures Multer for image uploads with memory storage
const storage = multer.memoryStorage();

// Filters for image files only
const fileFilter = (req, file, cb) => {
  try {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      throw new AppError(
        "Invalid file type",
        400,
        "UploadMiddleware",
        "Only image files are allowed"
      );
    }
  } catch (error) {
    cb(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to validate file",
            400,
            "UploadMiddleware",
            "Error in fileFilter"
          ),
      false
    );
  }
};

// Initializes Multer with storage, file filter, and size limit
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

export default upload;
