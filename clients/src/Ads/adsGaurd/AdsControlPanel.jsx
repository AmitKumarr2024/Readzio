import { useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAdsSettings,
  patchAdsSettings,
  fetchAdsRuntime,
  fetchAdsHealth,
  clearAdsMessages,
} from "../../store/adsSlice";
import { toast } from "react-hot-toast";
import {
  ShieldCheck,
  Power,
  LayoutGrid,
  Activity,
  AlertTriangle,
} from "lucide-react";

/* ======================================================
   CONSTANTS
====================================================== */

const PLACEMENTS = [
  { key: "card", label: "Card Ads" },
  { key: "inFeed", label: "In-Feed Ads" },
  { key: "inArticle", label: "In-Article Ads" },
  { key: "multiplex", label: "Multiplex Ads" },
  { key: "float", label: "Floating Ads" },
  { key: "horizontal", label: "Horizontal Banner Ads" },
];

/* ======================================================
   MAIN COMPONENT
====================================================== */

export default function AdsControlPanel() {
  const dispatch = useDispatch();

  const { settings, runtime, health, loading, error, successMessage } =
    useSelector((state) => state.ads);

  const user = useSelector((state) => state.auth?.user);
  const isAdmin = user?.role === "admin";

  /* ---------------- INIT ---------------- */
  useEffect(() => {
    dispatch(fetchAdsSettings());
    dispatch(fetchAdsRuntime());
    dispatch(fetchAdsHealth());
  }, [dispatch]);

  /* ---------------- TOASTS ---------------- */
  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage);
      dispatch(clearAdsMessages());
    }
    if (error) {
      toast.error(error);
      dispatch(clearAdsMessages());
    }
  }, [successMessage, error, dispatch]);

  /* ---------------- UPDATE ---------------- */
  const updateSetting = useCallback(
    async (payload) => {
      if (loading) return;

      await dispatch(patchAdsSettings(payload)).unwrap();

      // 🔥 CRITICAL: resync runtime + health
      dispatch(fetchAdsRuntime());
      dispatch(fetchAdsHealth());
    },
    [dispatch, loading]
  );

  /* ======================================================
     FINAL ADS STATUS (ONE SOURCE OF TRUTH)
  ====================================================== */

  const finalAdsStatus = useMemo(() => {
    if (!runtime?.adsEnabled) {
      return {
        text: "❌ Ads are OFF for everyone",
        color: "red",
      };
    }

    if (isAdmin && runtime?.disableForAdmins) {
      return {
        text: "⚠️ Ads are OFF for you (Admin)",
        color: "yellow",
      };
    }

    return {
      text: "✅ Ads are LIVE on the website",
      color: "green",
    };
  }, [runtime, isAdmin]);

  if (!settings) return <Skeleton />;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* ================= HEADER ================= */}
      <header className="flex items-center gap-3">
        <ShieldCheck className="w-7 h-7 text-indigo-600" />
        <h1 className="text-3xl font-bold tracking-tight">
          Ads Control Center
        </h1>
      </header>

      {/* ================= FINAL STATUS BANNER ================= */}
      <div
        className={`rounded-xl p-4 text-center font-semibold text-white ${
          finalAdsStatus.color === "green"
            ? "bg-green-600"
            : finalAdsStatus.color === "yellow"
            ? "bg-yellow-500"
            : "bg-red-600"
        }`}
      >
        {finalAdsStatus.text}
      </div>

      {/* ================= STATUS CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCard
          title="Runtime Status"
          value={runtime?.adsEnabled ? "Enabled" : "Disabled"}
          good={runtime?.adsEnabled}
          icon={Power}
        />

        <StatusCard
          title="Placements Active"
          value={
            runtime?.adsEnabled
              ? Object.values(runtime?.placements || {}).filter(Boolean).length
              : 0
          }
          icon={LayoutGrid}
        />

        <StatusCard
          title="System Health"
          value={health?.status || "Unknown"}
          good={health?.status === "ok"}
          icon={Activity}
        />
      </div>

      {/* ================= GLOBAL CONTROLS ================= */}
      <Section
        title="Global Controls"
        subtitle="Master switches for the entire ads system"
        icon={Power}
      >
        <ToggleRow
          label="Enable Ads Globally"
          description="Completely turn ads ON/OFF site-wide"
          checked={settings.globalEnabled}
          disabled={loading}
          onChange={(v) => updateSetting({ globalEnabled: v })}
        />

        <div>
          <ToggleRow
            label="Disable Ads for Admins"
            description="Admins will not see ads"
            checked={settings.disableForAdmins}
            disabled={loading}
            onChange={(v) => updateSetting({ disableForAdmins: v })}
          />
          <p className="text-xs text-gray-500 mt-1">
            ⚠️ This does NOT disable ads for normal users
          </p>
        </div>
      </Section>

      {/* ================= PLACEMENTS ================= */}
      <Section
        title="Ad Placements"
        subtitle="Control where ads are allowed to render"
        icon={LayoutGrid}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLACEMENTS.map((p) => (
            <ToggleRow
              key={p.key}
              label={p.label}
              checked={!!settings.placements?.[p.key]}
              disabled={loading}
              onChange={(v) =>
                updateSetting({
                  placements: {
                    ...settings.placements,
                    [p.key]: v,
                  },
                })
              }
            />
          ))}
        </div>
      </Section>

      {/* ================= WARNING ================= */}
      {!runtime?.adsEnabled && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-yellow-800">
          <AlertTriangle className="w-5 h-5" />
          Ads are currently disabled at runtime.
        </div>
      )}
    </div>
  );
}

/* ======================================================
   UI COMPONENTS
====================================================== */

const Section = ({ title, subtitle, icon: Icon, children }) => (
  <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-indigo-500" />
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
    </div>
    {children}
  </section>
);

const ToggleRow = ({ label, description, checked, disabled, onChange }) => (
  <div className="flex items-center justify-between gap-6">
    <div>
      <p className="font-medium">{label}</p>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>

    <button
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-14 h-7 rounded-full transition ${
        checked ? "bg-indigo-600" : "bg-gray-300"
      } ${disabled && "opacity-50 cursor-not-allowed"}`}
    >
      <span
        className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
          checked ? "translate-x-7" : ""
        }`}
      />
    </button>
  </div>
);

const StatusCard = ({ title, value, good, icon: Icon }) => (
  <div className="flex items-center gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
    <Icon className={`w-6 h-6 ${good ? "text-green-600" : "text-gray-400"}`} />
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  </div>
);

const Skeleton = () => (
  <div className="max-w-6xl mx-auto p-6 space-y-6 animate-pulse">
    <div className="h-8 w-64 bg-gray-300 rounded" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-20 bg-gray-300 rounded-xl" />
      ))}
    </div>
    <div className="h-48 bg-gray-300 rounded-xl" />
  </div>
);
