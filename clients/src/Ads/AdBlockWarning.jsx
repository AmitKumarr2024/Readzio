import React, { useState } from "react";

const AdBlockWarning = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("error");

  const verifyAdBlockDisabled = () => {
    // Re-check if ad blocker is disabled
    const testBait = document.createElement("div");
    testBait.className = "ad-banner adsbygoogle advertisement";
    testBait.style.cssText =
      "width: 1px !important; height: 1px !important; position: absolute !important; left: -10000px !important;";
    document.body.appendChild(testBait);

    setTimeout(() => {
      const isStillBlocked =
        !testBait ||
        testBait.offsetHeight === 0 ||
        testBait.offsetWidth === 0 ||
        window.getComputedStyle(testBait).display === "none";

      if (isStillBlocked) {
        setAlertType("error");
        setAlertMessage(
          "❌ Ad blocker is still active!\n\nPlease:\n1. Disable your ad blocker for this site\n2. Refresh the page (F5)\n3. Try again"
        );
        setShowAlert(true);
      } else {
        setAlertType("success");
        setAlertMessage(
          "🎉 Thank You!\n\nAd blocker disabled successfully!\nRefreshing page..."
        );
        setShowAlert(true);

        // Refresh page after success
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }

      if (testBait.parentNode) {
        document.body.removeChild(testBait);
      }
    }, 100);
  };

  return (
    <>
      {/* Custom Alert */}
      {showAlert && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn"
          onClick={() => setShowAlert(false)}
        >
          <div
            className={`max-w-sm w-full rounded-2xl shadow-2xl p-6 mx-4 animate-scaleIn border-2 ${
              alertType === "error"
                ? "bg-gradient-to-br from-red-50 to-orange-50 border-red-500"
                : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-500"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-3">
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${
                  alertType === "error" ? "bg-red-100" : "bg-green-100"
                }`}
              >
                <span className="text-2xl">
                  {alertType === "error" ? "⚠️" : "🎉"}
                </span>
              </div>
            </div>
            <p
              className={`whitespace-pre-line text-center leading-tight mb-4 ${
                alertType === "error"
                  ? "text-red-700 text-sm"
                  : "text-green-700 text-sm"
              }`}
            >
              {alertMessage}
            </p>
            <button
              onClick={() => setShowAlert(false)}
              className={`w-full py-2 rounded-lg font-bold text-white transition-all hover:scale-105 active:scale-95 ${
                alertType === "error"
                  ? "bg-gradient-to-r from-red-500 to-orange-500 shadow-md shadow-red-500/50"
                  : "bg-gradient-to-r from-green-500 to-emerald-500 shadow-md shadow-green-500/50"
              }`}
            >
              {alertType === "error" ? "Got It" : "Awesome!"}
            </button>
          </div>
        </div>
      )}

      {/* Main AdBlock Warning */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 backdrop-blur-lg bg-black/50 animate-fadeIn overflow-y-auto">
        <div className="relative max-w-sm w-full my-4 animate-scaleIn max-h-[90vh] overflow-y-auto">
          {/* Animated glow effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/30 via-orange-500/30 to-pink-500/30 rounded-2xl blur-xl animate-pulse" />
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-red-500/20 rounded-full blur-xl animate-pulse" />
          <div
            className="absolute -bottom-4 -left-4 w-20 h-20 bg-orange-500/20 rounded-full blur-xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />

          {/* Glass card */}
          <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-2xl p-6 shadow-2xl border border-white/20">
            {/* Icon and Title */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/50 animate-bounce mb-3">
                <span className="text-3xl">⚠️</span>
              </div>
              <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                Ad Blocker Detected
              </h2>
              <div className="h-1 w-24 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 mx-auto rounded-full shadow-md" />
            </div>

            {/* Message Box */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/20 shadow-inner">
              <p className="text-white text-base leading-tight text-center mb-3">
                We noticed you're using an{" "}
                <span className="font-bold text-yellow-300">ad blocker</span>.
              </p>
              <p className="text-white/90 text-sm leading-tight text-center mb-3">
                Our free tools are made possible by ads. They help us:
              </p>

              {/* Benefits list */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                  <span className="text-xl">💰</span>
                  <span className="text-white/90 text-xs">
                    Keep all tools{" "}
                    <strong className="text-green-300">100% free</strong>{" "}
                    forever
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                  <span className="text-xl">🔧</span>
                  <span className="text-white/90 text-xs">
                    Maintain servers & add{" "}
                    <strong className="text-blue-300">new features</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                  <span className="text-xl">👥</span>
                  <span className="text-white/90 text-xs">
                    Support our small team of{" "}
                    <strong className="text-purple-300">developers</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1 text-yellow-300 text-xs font-semibold bg-yellow-500/10 rounded-md py-1 px-3">
                <span>⚡</span>
                <span>Takes 5s • Supports us for years</span>
                <span>⚡</span>
              </div>
            </div>

            {/* Call to Action */}
            <button
              onClick={verifyAdBlockDisabled}
              className="w-full bg-gradient-to-r from-red-500 via-orange-500 to-red-500 text-white font-bold text-base py-3 px-4 rounded-lg shadow-xl shadow-red-500/40 hover:shadow-red-500/60 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              <span className="text-xl group-hover:scale-110 transition-transform">
                ✅
              </span>
              <span>I've Disabled It - Verify Now</span>
            </button>

            {/* Help text */}
            <p className="text-center text-white/60 text-xs mt-3 leading-tight">
              We'll verify that your ad blocker is disabled
            </p>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <p className="text-center text-white/50 text-xs">
                🔒 Your privacy is respected • No tracking • Just honest ads
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdBlockWarning;
