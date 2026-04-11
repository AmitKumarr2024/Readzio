import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { updateUser } from "../../store/userSlice";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Compass,
  SkipForward,
  CheckCircle,
} from "lucide-react";

// ─── Storage key used to persist tour completion across sessions ───────────────
const STORAGE_KEY = "app_tour_completed";

// ─── Tour Steps per Route ─────────────────────────────────────────────────────
// Each step targets a CSS class or ID selector already in your app.
// Add/remove steps here without touching any other component.
const STEPS_BY_ROUTE = {
  "/createPost": [
    {
      target: "#post-type-modal",
      title: "Choose Post Type",
      content: "Start by selecting the type of content you want to publish.",
      placement: "bottom",
    },
    {
      target: "#category-modal",
      title: "Pick a Category",
      content: "Categorise your post so readers can find it easily.",
      placement: "bottom",
    },
    {
      target: "#create-post-main",
      title: "Your Workspace",
      content: "This is your main editor — write, format, and build your post.",
      placement: "top",
    },
    {
      target: "#post-editor-wrapper",
      title: "Rich Editor",
      content: "Use the editor toolbar to add headings, images, and more.",
      placement: "right",
    },
    {
      target: "#post-preview-list-wrapper",
      title: "Draft Manager",
      content: "Preview drafts and manage saved versions from here.",
      placement: "left",
    },
    {
      target: "#cancel-post-button",
      title: "Cancel Anytime",
      content: "Changed your mind? Cancel here to go back to the home feed.",
      placement: "bottom",
    },
  ],

  // Default steps shown on all other routes (home, feed, etc.)
  default: [
    {
      target: ".nav-home",
      title: "Home Feed",
      content: "Click here anytime to return to your personalised home feed.",
      placement: "bottom",
    },
    {
      target: ".search-input",
      title: "Search",
      content: "Find articles, authors, and topics instantly.",
      placement: "bottom",
    },
    {
      target: ".btn-create-post",
      title: "Create a Post",
      content: "Ready to share? Click here to start writing a new post.",
      placement: "bottom",
    },
    {
      target: ".categories-section",
      title: "Browse Categories",
      content:
        "Explore posts filtered by topic — tech, design, life, and more.",
      placement: "top",
    },
    {
      target: ".tabbed-post-section",
      title: "Post Tabs",
      content: "Switch between All Posts, Following, and your own Posts here.",
      placement: "bottom",
    },
    {
      target: ".post-tab-content",
      title: "Post Feed",
      content: "Scroll through posts in the selected tab. Click any to read.",
      placement: "top",
    },
    {
      target: ".sidebar-toggle-btn",
      title: "Sidebar Menu",
      content: "Toggle the sidebar to access navigation and shortcuts.",
      placement: "left",
    },
    {
      target: ".user-profile-link",
      title: "Your Profile",
      content: "View your profile, stats, and settings from here.",
      placement: "left",
    },
  ],
};

// ─── Tooltip Placement Calculator ─────────────────────────────────────────────
// Computes pixel position of the tooltip relative to the target element's rect.
// Falls back gracefully when target is off-screen or near an edge.
function calcTooltipPosition(rect, placement, tooltipW = 320, tooltipH = 200) {
  const gap = 14; // space between highlight and tooltip
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top, left;

  switch (placement) {
    case "top":
      top = rect.top - tooltipH - gap;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
    case "left":
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.left - tooltipW - gap;
      break;
    case "right":
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.right + gap;
      break;
    case "bottom":
    default:
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
  }

  // ── Boundary clamping — keep tooltip inside the viewport ──
  const MARGIN = 12;
  left = Math.max(MARGIN, Math.min(left, vw - tooltipW - MARGIN));
  top = Math.max(MARGIN, Math.min(top, vh - tooltipH - MARGIN));

  return { top, left };
}

// ─── Spotlight Overlay ────────────────────────────────────────────────────────
// Renders a semi-transparent full-screen overlay with a cut-out around the
// target element using an SVG clipPath, creating a spotlight effect.
function SpotlightOverlay({ rect }) {
  if (!rect) return null;

  const PAD = 8; // padding around the highlighted element
  const r = 10; // corner radius of the spotlight hole

  const x = rect.left - PAD;
  const y = rect.top - PAD;
  const w = rect.width + PAD * 2;
  const h = rect.height + PAD * 2;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // SVG path: full screen minus rounded rect cutout (even-odd fill rule)
  const path = `
    M 0 0 H ${vw} V ${vh} H 0 Z
    M ${x + r} ${y}
    H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r}
    V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h}
    H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r}
    V ${y + r} Q ${x} ${y} ${x + r} ${y} Z
  `;

  return (
    <svg
      className="fixed inset-0 z-[9998] pointer-events-none"
      width={vw}
      height={vh}
      style={{ position: "fixed", top: 0, left: 0 }}
    >
      <path d={path} fill="rgba(0,0,0,0.55)" fillRule="evenodd" />
      {/* Glowing border around the spotlight hole */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r}
        fill="none"
        stroke="rgba(99,102,241,0.7)"
        strokeWidth="2"
      />
    </svg>
  );
}

// ─── Tour Tooltip Card ─────────────────────────────────────────────────────────
// The floating card shown during each step with step info and nav controls.
function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  position,
  onNext,
  onPrev,
  onSkip,
  onFinish,
}) {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  return (
    <div
      className="fixed z-[9999] w-80 animate-tour-in"
      style={{ top: position.top, left: position.left }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800
                   shadow-2xl overflow-hidden"
        style={{
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(99,102,241,0.15)",
        }}
      >
        {/* ── Progress bar across the top ────────────────────────────── */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-indigo-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-5">
          {/* ── Header row: icon + title + close ─────────────────────── */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Compass icon as tour brand mark */}
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug truncate">
                {step.title}
              </h4>
            </div>

            {/* Skip/close button */}
            <button
              onClick={onSkip}
              className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0
                         hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Skip tour"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

          {/* ── Step content ──────────────────────────────────────────── */}
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
            {step.content}
          </p>

          {/* ── Footer: step counter + navigation buttons ─────────────── */}
          <div className="flex items-center justify-between gap-3">
            {/* Step counter pill */}
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 tabular-nums">
              {stepIndex + 1} / {totalSteps}
            </span>

            <div className="flex items-center gap-2">
              {/* Previous button — hidden on first step */}
              {!isFirst && (
                <button
                  onClick={onPrev}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                             border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400
                             hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}

              {/* Next or Finish button */}
              {isLast ? (
                <button
                  onClick={onFinish}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold
                             bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Done
                </button>
              ) : (
                <button
                  onClick={onNext}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold
                             bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Step dot indicators ──────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-1.5 mt-2.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === stepIndex
                ? "w-4 h-1.5 bg-indigo-500"
                : "w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main AppTour Component ────────────────────────────────────────────────────
export default function AppTour() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(true); // hide tooltip briefly on step change
  const observerRef = useRef(null);

  // Resolve which step list to use based on current route
  const steps = STEPS_BY_ROUTE[location.pathname] || STEPS_BY_ROUTE["default"];

  const currentStep = steps[stepIndex];

  // ── Determine whether to start the tour ──────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const completedLocal = localStorage.getItem(STORAGE_KEY);
    // Start if tour hasn't been completed in localStorage or user profile
    if (!completedLocal && !user?.tourCompleted) {
      // Small delay so the page DOM has time to mount all targets
      const t = setTimeout(() => setRun(true), 800);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated, user]);

  // ── Reset step when route changes (user navigated mid-tour) ──────────────
  useEffect(() => {
    setStepIndex(0);
    setVisible(true);
  }, [location.pathname]);

  // ── Find target element and calculate positions ───────────────────────────
  // Uses ResizeObserver + scroll listener so the tooltip repositions when the
  // page layout changes (e.g. sidebar opens, content shifts).
  const measureTarget = useCallback(() => {
    if (!run || !currentStep) return;

    const el = document.querySelector(currentStep.target);
    if (!el) return;

    // Scroll element into view smoothly before measuring
    el.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });

    // Short delay for scroll to settle before measuring rect
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      const pos = calcTooltipPosition(rect, currentStep.placement || "bottom");
      setTooltipPos(pos);
      setVisible(true);
    }, 320);
  }, [run, currentStep]);

  // Re-measure on step change, scroll, and resize
  useEffect(() => {
    if (!run) return;

    setVisible(false); // briefly hide while repositioning

    // Disconnect previous observer
    observerRef.current?.disconnect();

    measureTarget();

    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);

    return () => {
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
      observerRef.current?.disconnect();
    };
  }, [run, measureTarget]);

  // ── Tour completion — persists to localStorage + user profile ─────────────
  const completeTour = useCallback(
    (skipped = false) => {
      setRun(false);
      setTargetRect(null);
      localStorage.setItem(STORAGE_KEY, "true");
      // Only dispatch Redux update if user hasn't already completed it
      if (!user?.tourCompleted) {
        dispatch(updateUser({ tourCompleted: true }));
      }
    },
    [dispatch, user],
  );

  // ── Navigation handlers ───────────────────────────────────────────────────

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setVisible(false);
      setTimeout(() => setStepIndex((i) => i + 1), 150);
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setVisible(false);
      setTimeout(() => setStepIndex((i) => i - 1), 150);
    }
  };

  const handleSkip = () => completeTour(true);
  const handleFinish = () => completeTour(false);

  // ── Guard: don't render if not authenticated or tour not running ──────────
  if (!isAuthenticated || !run) return null;

  return (
    <>
      {/* ── Keyboard support: Escape to skip, Arrow keys to navigate ── */}
      <KeyboardHandler
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={handleSkip}
      />

      {/* ── Clickable backdrop (click outside tooltip = skip) ─────────── */}
      <div
        className="fixed inset-0 z-[9997]"
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* ── Spotlight cutout overlay ───────────────────────────────────── */}
      <SpotlightOverlay rect={targetRect} />

      {/* ── Tooltip card ──────────────────────────────────────────────── */}
      {visible && currentStep && (
        <TourTooltip
          step={currentStep}
          stepIndex={stepIndex}
          totalSteps={steps.length}
          position={tooltipPos}
          onNext={handleNext}
          onPrev={handlePrev}
          onSkip={handleSkip}
          onFinish={handleFinish}
        />
      )}
    </>
  );
}

// ─── Keyboard Handler (internal helper) ──────────────────────────────────────
// Mounts a keydown listener for tour keyboard navigation.
// Extracted into its own component so it doesn't pollute AppTour's render.
function KeyboardHandler({ onNext, onPrev, onSkip }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === "Enter") onNext();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNext, onPrev, onSkip]);

  return null;
}
