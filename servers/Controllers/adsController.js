import AdsSettings from "../Models/AdsSettings.js";
import { AppError } from "../Utils/AppError.js";

/* -------------------------------------------------
   GET ADS SETTINGS (PUBLIC)
------------------------------------------------- */
export const getAdsSettings = async (req, res, next) => {
  try {
    let settings = await AdsSettings.findOne();

    // Ensure singleton
    if (!settings) {
      settings = await AdsSettings.create({});
    }

    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    next(
      new AppError(
        error.message,
        500,
        "GetAdsSettings",
        "Failed to fetch ads settings"
      )
    );
  }
};

/* -------------------------------------------------
   PATCH ADS SETTINGS (ADMIN ONLY)
------------------------------------------------- */
export const patchAdsSettings = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      throw new AppError(
        "Forbidden",
        403,
        "PatchAdsSettings",
        "Admin access required"
      );
    }

    const { globalEnabled, disableForAdmins, placements } = req.body;
    const update = {};

    if (typeof globalEnabled === "boolean") {
      update.globalEnabled = globalEnabled;
    }

    if (typeof disableForAdmins === "boolean") {
      update.disableForAdmins = disableForAdmins;
    }

    if (placements && typeof placements === "object") {
      update.placements = placements;
    }

    if (Object.keys(update).length === 0) {
      throw new AppError(
        "Invalid payload",
        400,
        "PatchAdsSettings",
        "No valid fields provided"
      );
    }

    const settings = await AdsSettings.findOneAndUpdate(
      {},
      {
        ...update,
        updatedBy: req.user._id,
      },
      {
        new: true,
        upsert: true,
      }
    );

    // 🔴 Realtime sync
    req.io.emit("ads:update", settings);

    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "PatchAdsSettings",
            "Failed to update ads settings"
          )
    );
  }
};
