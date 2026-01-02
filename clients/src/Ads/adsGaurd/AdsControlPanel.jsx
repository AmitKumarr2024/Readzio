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
  CheckCircle2,
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

  const finalStatus = useMemo(() => {
    if (!runtime?.adsEnabled)
      return { text: "Ads Offline", color: "bg-red-500", icon: Power };
    if (isAdmin && runtime?.disableForAdmins)
      return {
        text: "Admin Stealth Active",
        color: "bg-amber-500",
        icon: ShieldCheck,
      };
    return {
      text: "Ads Live & Running",
      color: "bg-emerald-500",
      icon: CheckCircle2,
    };
  }, [runtime, isAdmin]);

  if (!settings) return <Skeleton />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] p-6 transition-colors duration-500">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* HEADER & GLOBAL STATUS */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
              <Zap className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Ads Engine
              </h1>
              <p className="text-slate-500 font-medium">
                Global Revenue & Delivery Control
              </p>
            </div>
          </div>
          <div
            className={`flex items-center gap-3 px-5 py-2.5 rounded-full text-white font-bold text-sm shadow-lg transition-all ${
              finalStatus.color
            } ${finalStatus.text.includes("Live") ? "pulse-green" : ""}`}
          >
            <finalStatus.icon size={18} />
            {finalStatus.text}
          </div>
        </header>

        {/* TOP STATUS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatusCard
            icon={Power}
            label="Engine Status"
            value={runtime?.adsEnabled ? "Active" : "Halted"}
            active={runtime?.adsEnabled}
          />
          <StatusCard
            icon={LayoutGrid}
            label="Active Slots"
            value={
              runtime?.adsEnabled
                ? Object.values(runtime?.placements || {}).filter(Boolean)
                    .length
                : 0
            }
            active={true}
          />
          <StatusCard
            icon={Activity}
            label="System Health"
            value={health?.status?.toUpperCase() || "OK"}
            active={health?.status === "ok"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* MASTER CONTROLS (LEFT) */}
          <div className="lg:col-span-5 space-y-6">
            <section className="glass-panel rounded-[2rem] p-8">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8">
                Master Switches
              </h3>
              <div className="space-y-4">
                <ModernToggle
                  label="Global Revenue"
                  description="The master switch for all ads."
                  icon={Zap}
                  checked={settings.globalEnabled}
                  onChange={(v) => updateSetting({ globalEnabled: v })}
                  disabled={loading}
                />
                <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2" />
                <ModernToggle
                  label="Admin Stealth"
                  description="Hide ads while you work."
                  icon={ShieldCheck}
                  checked={settings.disableForAdmins}
                  onChange={(v) => updateSetting({ disableForAdmins: v })}
                  disabled={loading}
                />
              </div>
            </section>
          </div>

          {/* PLACEMENT CONTROLS (RIGHT) */}
          <div className="lg:col-span-7">
            <section className="glass-panel rounded-[2rem] p-8">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8">
                Ad Placement Deployment
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PLACEMENTS.map((p) => (
                  <div
                    key={p.key}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 transition-all"
                  >
                    <ModernToggle
                      label={p.label}
                      checked={!!settings.placements?.[p.key]}
                      onChange={(v) =>
                        updateSetting({
                          placements: { ...settings.placements, [p.key]: v },
                        })
                      }
                      disabled={loading}
                      small
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* RUNTIME WARNING */}
        {!runtime?.adsEnabled && (
          <div className="flex items-center gap-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 p-4 rounded-2xl">
            <AlertTriangle className="text-red-500" />
            <p className="text-sm font-bold text-red-700 dark:text-red-400">
              System Alert: The ad server is currently returning a disabled
              status. Changes here will sync once the server is reachable.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* REUSABLE SUB-COMPONENTS */

function ModernToggle({
  label,
  description,
  icon: Icon,
  checked,
  onChange,
  disabled,
  small,
}) {
  return (
    <div
      className={`master-switch-row flex items-center justify-between p-3 rounded-2xl ${
        checked && !small ? "active" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        {Icon && !small && (
          <div
            className={`p-2.5 rounded-xl transition-all duration-300 ${
              checked
                ? "bg-indigo-600 text-white"
                : "bg-slate-200 dark:bg-slate-700 text-slate-400"
            }`}
          >
            <Icon size={20} />
          </div>
        )}
        <div>
          <p
            className={`font-bold transition-colors ${
              checked
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-slate-700 dark:text-slate-200"
            }`}
          >
            {label}
          </p>
          {description && (
            <p className="text-xs text-slate-500 font-medium">{description}</p>
          )}
        </div>
      </div>

      <div
        onClick={() => !disabled && onChange(!checked)}
        className={`toggle-track ${checked ? "bg-on" : "bg-off"} ${
          disabled
            ? "opacity-30 cursor-not-allowed"
            : "hover:brightness-110 active:scale-95 transition-all"
        }`}
      >
        <div className={`toggle-thumb ${checked ? "active-thumb" : ""}`} />
      </div>
    </div>
  );
}

function StatusCard({ icon: Icon, label, value, active }) {
  return (
    <div className="glass-panel p-6 rounded-[2rem] flex items-center gap-5 group hover:shadow-xl transition-all duration-300">
      <div
        className={`p-3 rounded-2xl transition-all ${
          active
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
            : "bg-slate-100 dark:bg-slate-800 text-slate-400"
        }`}
      >
        <Icon size={24} className={active ? "animate-pulse" : ""} />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-xl font-black text-slate-800 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="max-w-5xl mx-auto p-10 space-y-10 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 bg-slate-200 dark:bg-slate-800 rounded-[2rem]"
          />
        ))}
      </div>
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-5 h-80 bg-slate-200 dark:bg-slate-800 rounded-[2rem]" />
        <div className="col-span-7 h-80 bg-slate-200 dark:bg-slate-800 rounded-[2rem]" />
      </div>
    </div>
  );
}
