import { useEffect, useCallback } from "react";
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

const PLACEMENTS = [
  { key: "card", label: "Card Ads" },
  { key: "inFeed", label: "In-Feed Ads" },
  { key: "inArticle", label: "In-Article Ads" },
  { key: "multiplex", label: "Multiplex Ads" },
  { key: "float", label: "Floating Ads" },
  { key: "horizontal", label: "Horizontal Banner Ads" },
];

export default function AdsControlPanel() {
  const dispatch = useDispatch();
  const { settings, runtime, health, loading, error, successMessage } =
    useSelector((state) => state.ads);

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
    (payload) => {
      if (!loading) dispatch(patchAdsSettings(payload));
    },
    [dispatch, loading]
  );

  if (!settings) return <Skeleton />;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10">
      {/* ================= HEADER ================= */}
      <header className="flex items-center gap-3">
        <ShieldCheck className="w-7 h-7 text-indigo-600" />
        <h1 className="text-3xl font-bold tracking-tight">
          Ads Control Center
        </h1>
      </header>

      {/* ================= STATUS BAR ================= */}
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
            runtime?.placements
              ? Object.values(runtime.placements).filter(Boolean).length
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

      {/* ================= GLOBAL ================= */}
      <Section
        title="Global Controls"
        icon={Power}
        subtitle="Master switches for the entire ads system"
      >
        <ToggleRow
          label="Enable Ads Globally"
          description="Completely turn ads ON/OFF site-wide"
          checked={settings.globalEnabled}
          disabled={loading}
          onChange={(v) => updateSetting({ globalEnabled: v })}
        />

        <ToggleRow
          label="Disable Ads for Admins"
          description="Admins will not see ads"
          checked={settings.disableForAdmins}
          disabled={loading}
          onChange={(v) => updateSetting({ disableForAdmins: v })}
        />
      </Section>

      {/* ================= PLACEMENTS ================= */}
      <Section
        title="Ad Placements"
        icon={LayoutGrid}
        subtitle="Control where ads are allowed to render"
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

      {/* ================= WARNINGS ================= */}
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
  <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-6">
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
      className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
        checked ? "bg-indigo-600" : "bg-gray-300"
      } ${disabled && "opacity-50 cursor-not-allowed"}`}
    >
      <span
        className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${
          checked ? "translate-x-7" : ""
        }`}
      />
    </button>
  </div>
);

const StatusCard = ({ title, value, good, icon: Icon }) => (
  <div className="flex items-center gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
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
