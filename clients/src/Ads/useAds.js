import { useSelector } from "react-redux";
import useAdBlockDetector from "./useAdBlockDetector";

export const useAds = (placement) => {
  const settings = useSelector((state) => state.ads.settings);
  const user = useSelector((state) => state.auth?.user);
  const isAdBlocked = useAdBlockDetector();

  // Not ready yet
  if (!settings) return false;

  // Ad blocker detected
  if (isAdBlocked) return false;

  // Global kill switch
  if (!settings.globalEnabled) return false;

  // Admin logic
  if (user?.role === "admin" && settings.disableForAdmins) {
    return false;
  }

  // Placement-level control
  return settings.placements?.[placement] !== false;
};
