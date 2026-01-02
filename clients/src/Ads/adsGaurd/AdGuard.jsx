// Ads/adsGaurd/AdGuard.jsx
import { useSelector } from "react-redux";

const AdGuard = ({ placement, children }) => {
  const { runtime, settings } = useSelector((state) => state.ads);
  const user = useSelector((state) => state.auth?.user);

  // --------------------------------------------------
  // 1️⃣ Resolve FINAL flags (runtime > settings fallback)
  // --------------------------------------------------
  const adsEnabled = runtime?.adsEnabled ?? settings?.globalEnabled ?? false;

  const disableForAdmins =
    runtime?.disableForAdmins ?? settings?.disableForAdmins ?? false;

  const placementEnabled =
    runtime?.placements?.[placement] ??
    settings?.placements?.[placement] ??
    false;

  // --------------------------------------------------
  // 2️⃣ Global OFF → no ads
  // --------------------------------------------------
  if (!adsEnabled) return null;

  // --------------------------------------------------
  // 3️⃣ Placement OFF → no ads
  // --------------------------------------------------
  if (!placementEnabled) return null;

  // --------------------------------------------------
  // 4️⃣ Admin-specific rule
  // --------------------------------------------------
  if (user?.role === "admin" && disableForAdmins) {
    return null;
  }

  // --------------------------------------------------
  // 5️⃣ Otherwise → allow render
  // --------------------------------------------------
  return <>{children}</>;
};

export default AdGuard;
