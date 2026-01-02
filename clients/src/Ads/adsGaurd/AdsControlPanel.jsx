import React, { useEffect, useCallback, useMemo } from "react";
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
  Zap,
  Info,
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
  const user = useSelector((state) => state.auth?.user);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    dispatch(fetchAdsSettings());
    dispatch(fetchAdsRuntime());
    dispatch(fetchAdsHealth());
  }, [dispatch]);

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

  const updateSetting = useCallback(
    async (payload) => {
      if (loading) return;
      await dispatch(patchAdsSettings(payload)).unwrap();
      dispatch(fetchAdsRuntime());
      dispatch(fetchAdsHealth());
    },
    [dispatch, loading]
  );

  const finalAdsStatus = useMemo(() => {
    if (!runtime?.adsEnabled)
      return { text: "Ads System Offline", color: "bg-red-500", icon: Power };
    if (isAdmin && runtime?.disableForAdmins)
      return {
        text: "Ads Hidden for Admins",
        color: "bg-amber-500",
        icon: ShieldCheck,
      };
    return {
      text: "Ads System Live & Healthy",
      color: "bg-emerald-500",
      icon: Zap,
    };
  }, [runtime, isAdmin]);

  if (!settings) return <Skeleton />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* HEADER SECTION */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Ads Control Center
              </h1>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                Manage revenue and ad delivery
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-3 px-6 py-3 rounded-full text-white shadow-xl transition-all duration-500 ${
              finalAdsStatus.color
            } ${
              finalAdsStatus.color === "bg-emerald-500"
                ? "status-pulse-green"
                : ""
            }`}
          >
            <finalAdsStatus.icon className="w-5 h-5" />
            <span className="font-bold tracking-wide">
              {finalAdsStatus.text}
            </span>
          </div>
        </header>

        {/* STATUS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatusCard
            title="Runtime Engine"
            value={runtime?.adsEnabled ? "Operational" : "Halted"}
            status={runtime?.adsEnabled ? "success" : "danger"}
            icon={Power}
            detail="Current server-side status"
          />
          <StatusCard
            title="Active Layers"
            value={`${
              runtime?.adsEnabled
                ? Object.values(runtime?.placements || {}).filter(Boolean)
                    .length
                : 0
            } / ${PLACEMENTS.length}`}
            status="info"
            icon={LayoutGrid}
            detail="Enabled ad placements"
          />
          <StatusCard
            title="System Health"
            value={health?.status?.toUpperCase() || "UNKNOWN"}
            status={health?.status === "ok" ? "success" : "warning"}
            icon={Activity}
            detail="API & Provider connectivity"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* GLOBAL CONTROLS */}
          <div className="lg:col-span-1 space-y-6">
            <Section title="Master Switches" icon={Zap}>
              <div className="space-y-8">
                <ModernToggle
                  label="Global Revenue"
                  description="The master switch for all ads."
                  icon={Zap}
                  checked={settings.globalEnabled}
                  disabled={loading}
                  onChange={(v) => updateSetting({ globalEnabled: v })}
                />
                <ModernToggle
                  label="Admin Stealth"
                  description="Hide ads while you work."
                  icon={ShieldCheck}
                  checked={settings.disableForAdmins}
                  disabled={loading}
                  onChange={(v) => updateSetting({ disableForAdmins: v })}
                />
                <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Disabling ads for admins allows for a cleaner management
                    experience but won't affect users.
                  </p>
                </div>
              </div>
            </Section>
          </div>

          {/* PLACEMENT CONTROLS */}
          <div className="lg:col-span-2">
            <Section title="Deployment Placements" icon={LayoutGrid}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PLACEMENTS.map((p) => (
                  <div
                    key={p.key}
                    className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 placement-item"
                  >
                    <ToggleRow
                      label={p.label}
                      checked={!!settings.placements?.[p.key]}
                      disabled={loading}
                      onChange={(v) =>
                        updateSetting({
                          placements: { ...settings.placements, [p.key]: v },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>

        {/* FOOTER WARNING */}
        {!runtime?.adsEnabled && (
          <div className="flex items-center gap-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-5 rounded-2xl animate-bounce">
            <div className="p-2 bg-red-100 dark:bg-red-800 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-200" />
            </div>
            <div>
              <p className="font-bold text-red-800 dark:text-red-200">
                Revenue Warning
              </p>
              <p className="text-sm text-red-600 dark:text-red-300">
                Ads are currently halted at the runtime level. No impressions
                are being recorded.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* UI SUB-COMPONENTS */

const Section = ({ title, icon: Icon, children }) => (
  <section className="glass-card rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
    <div className="flex items-center gap-3 mb-8">
      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
        <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white">
        {title}
      </h2>
    </div>
    {children}
  </section>
);

const ToggleRow = ({ label, description, checked, disabled, onChange }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex-1">
      <p className="font-bold text-gray-700 dark:text-gray-200">{label}</p>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
          {description}
        </p>
      )}
    </div>
    <button
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 ring-offset-2 focus:ring-2 ring-indigo-500
        ${
          checked
            ? "bg-indigo-600 toggle-active"
            : "bg-gray-300 dark:bg-gray-700"
        }
        ${
          disabled
            ? "opacity-40 cursor-not-allowed"
            : "hover:scale-105 active:scale-95"
        }`}
    >
      <span className="toggle-dot absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md" />
    </button>
  </div>
);

const ModernToggle = ({
  label,
  description,
  checked,
  onChange,
  disabled,
  icon: Icon,
}) => {
  return (
    <div
      className={`switch-container group ${
        checked ? "bg-indigo-50/50 dark:bg-indigo-900/10" : "bg-transparent"
      }`}
    >
      <div className="flex gap-4 items-center">
        {Icon && (
          <div
            className={`p-2 rounded-lg transition-colors ${
              checked
                ? "bg-indigo-100 text-indigo-600"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            <Icon size={18} />
          </div>
        )}
        <div>
          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-tight">
            {label}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {description}
          </p>
        </div>
      </div>

      <div
        onClick={() => !disabled && onChange(!checked)}
        className={`toggle-track ${checked ? "toggle-active" : ""} ${
          disabled ? "opacity-30 cursor-not-allowed" : ""
        }`}
      >
        <div className="toggle-thumb" />
      </div>
    </div>
  );
};
const StatusCard = ({ title, value, status, icon: Icon, detail }) => {
  const statusColors = {
    success: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
    warning: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
    danger: "text-red-600 bg-red-50 dark:bg-red-900/20",
    info: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
  };

  return (
    <div className="glass-card p-5 rounded-3xl flex flex-col gap-3 shadow-sm border border-gray-100 dark:border-gray-800 group hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-xl ${statusColors[status]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
          {status}
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </p>
        <p className="text-2xl font-black text-gray-800 dark:text-white">
          {value}
        </p>
        <p className="text-[10px] text-gray-400 mt-1 uppercase font-semibold">
          {detail}
        </p>
      </div>
    </div>
  );
};

const Skeleton = () => (
  <div className="max-w-6xl mx-auto p-8 space-y-8 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="h-10 w-64 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded-full" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-32 bg-gray-200 dark:bg-gray-800 rounded-3xl"
        />
      ))}
    </div>
    <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
  </div>
);
