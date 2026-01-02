import AdsSettings from "../Models/AdsSettings.js";
import { AppError } from "../Utils/AppError.js";

/* =================================================
   GET ADS SETTINGS (PUBLIC – ADMIN PANEL USE)
================================================= */
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

/* =================================================
   PATCH ADS SETTINGS (ADMIN ONLY)
================================================= */
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
      { new: true, upsert: true }
    );

    // 🔴 Realtime sync to clients
    if (req.io) {
      req.io.emit("ads:update", settings);
    }

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

/* =================================================
   ADS RUNTIME DECISION (FRONTEND USE)
================================================= */
export const getAdsRuntime = async (req, res, next) => {
  try {
    const settings = await AdsSettings.findOne();

    if (!settings || !settings.globalEnabled) {
      return res.status(200).json({
        adsEnabled: false,
        reason: "GLOBAL_DISABLED",
        placements: {},
      });
    }

    const isAdmin = req.user?.role === "admin";

    if (isAdmin && settings.disableForAdmins) {
      return res.status(200).json({
        adsEnabled: false,
        reason: "ADMIN_DISABLED",
        placements: {},
      });
    }

    res.status(200).json({
      adsEnabled: true,
      reason: null,
      placements: settings.placements || {},
    });
  } catch (error) {
    next(
      new AppError(
        error.message,
        500,
        "GetAdsRuntime",
        "Failed to resolve ads runtime"
      )
    );
  }
};

/* =================================================
   ADS SYSTEM HEALTH (DEBUG / ADMIN)
================================================= */
export const getAdsHealth = async (req, res) => {
  try {
    const settings = await AdsSettings.findOne();

    res.status(200).json({
      status: "ok",
      settingsFound: !!settings,
      globalEnabled: settings?.globalEnabled ?? false,
      disableForAdmins: settings?.disableForAdmins ?? false,
      enabledPlacements: settings?.placements
        ? Object.entries(settings.placements)
            .filter(([, v]) => v)
            .map(([k]) => k)
        : [],
      updatedAt: settings?.updatedAt || null,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Ads health check failed",
    });
  }
};
