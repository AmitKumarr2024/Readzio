import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { Timer, AlertCircle, Lock } from "lucide-react";

const RateLimitModal = () => {
  const {
    isLimited,
    retryAfter,
    maxLimit = 60,
  } = useSelector((state) => state.rateLimit);

  // Calculate SVG circle math
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = useMemo(() => {
    const progress = retryAfter / maxLimit;
    return circumference - progress * circumference;
  }, [retryAfter, maxLimit, circumference]);

  if (!isLimited) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Animated Overlay */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />

      {/* Modal Card */}
      <div className="glass-surface animate-modal-entry relative w-full max-w-[400px] rounded-[2.5rem] p-8 text-center overflow-hidden">
        {/* Top Icon Badge */}
        <div className="animate-float mx-auto w-16 h-16 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none flex items-center justify-center mb-6">
          <Lock className="text-white w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Take a Breather
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium px-4 leading-relaxed">
          You're moving a bit fast. We need a moment to catch up with your
          requests.
        </p>

        {/* Visual Countdown Section */}
        <div className="relative flex items-center justify-center my-8">
          <svg className="timer-svg" width="120" height="120">
            {/* Background Track */}
            <circle
              className="text-slate-100 dark:text-slate-800"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="60"
              cy="60"
            />
            {/* Animated Progress Stroke */}
            <circle
              className="timer-circle text-indigo-600 transition-all"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="60"
              cy="60"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {retryAfter}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              Seconds
            </span>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-center gap-2 py-3 px-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
          <Timer size={14} className="text-indigo-500" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">
            Auto-unlocking shortly
          </p>
        </div>

        {/* Decorative background element */}
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default RateLimitModal;
