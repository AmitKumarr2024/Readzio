// Ads/adsGaurd/AdGuard.jsx
import { useSelector } from "react-redux";

const AdGuard = ({ placement, children }) => {
  const { runtime, settings } = useSelector((state) => state.ads);
  const user = useSelector((state) => state.auth?.user);

  // ⛔ runtime not loaded yet
  if (!runtime && !settings) return null;

  // ⛔ ads globally disabled
  if (runtime && runtime.adsEnabled === false) return null;

  // ⛔ admin ads disabled
  if (
    user?.role === "admin" &&
    (runtime?.disableForAdmins ?? settings?.disableForAdmins)
  ) {
    return null;
  }

  // ⛔ placement disabled
  const placementEnabled =
    runtime?.placements?.[placement] ?? settings?.placements?.[placement];

  if (!placementEnabled) return null;

  return <>{children}</>;
};

export default AdGuard;
