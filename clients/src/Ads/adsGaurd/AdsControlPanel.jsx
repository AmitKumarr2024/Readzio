import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAdsSettings,
  patchAdsSettings,
  clearAdsMessages,
} from "../../store/adsSlice";
import { toast } from "react-hot-toast";

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
  const { settings, loading, error, successMessage } = useSelector(
    (state) => state.ads
  );

  useEffect(() => {
    dispatch(fetchAdsSettings());
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
    (payload) => {
      if (!loading) dispatch(patchAdsSettings(payload));
    },
    [dispatch, loading]
  );

  if (!settings) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Ads Control Panel</h1>

      <Section title="Global Controls">
        <Toggle
          label="Enable Ads Globally"
          checked={settings.globalEnabled}
          disabled={loading}
          onChange={(v) => updateSetting({ globalEnabled: v })}
        />

        <Toggle
          label="Disable Ads for Admins"
          checked={settings.disableForAdmins}
          disabled={loading}
          onChange={(v) => updateSetting({ disableForAdmins: v })}
        />
      </Section>

      <Section title="Ad Placements">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLACEMENTS.map((p) => (
            <Toggle
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
    </div>
  );
}

/* ---------------- UI ---------------- */

const Section = ({ title, children }) => (
  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm space-y-4">
    <h2 className="text-lg font-semibold">{title}</h2>
    {children}
  </div>
);

const Toggle = ({ label, checked, disabled, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium">{label}</span>
    <button
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition ${
        checked ? "bg-green-500" : "bg-gray-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition ${
          checked ? "translate-x-6" : ""
        }`}
      />
    </button>
  </div>
);
