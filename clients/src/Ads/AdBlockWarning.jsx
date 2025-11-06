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
            className={`max-w-md w-full rounded-3xl shadow-2xl p-8 mx-4 animate-scaleIn border-4 ${
              alertType === "error"
                ? "bg-gradient-to-br from-red-50 to-orange-50 border-red-500"
                : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-500"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div
                className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 ${
                  alertType === "error" ? "bg-red-100" : "bg-green-100"
                }`}
              >
                <span className="text-4xl">
                  {alertType === "error" ? "⚠️" : "🎉"}
                </span>
              </div>
            </div>
            <p
              className={`whitespace-pre-line text-center leading-relaxed mb-6 ${
                alertType === "error" ? "text-red-700" : "text-green-700"
              }`}
            >
              {alertMessage}
            </p>
            <button
              onClick={() => setShowAlert(false)}
              className={`w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-105 active:scale-95 ${
                alertType === "error"
                  ? "bg-gradient-to-r from-red-500 to-orange-500 shadow-lg shadow-red-500/50"
                  : "bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/50"
              }`}
            >
              {alertType === "error" ? "Got It" : "Awesome!"}
            </button>
          </div>
        </div>
      )}

      {/* Main AdBlock Warning */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-lg bg-black/50 animate-fadeIn overflow-y-auto">
        <div className="relative max-w-lg w-full my-8 animate-scaleIn">
          {/* Animated glow effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/30 via-orange-500/30 to-pink-500/30 rounded-3xl blur-2xl animate-pulse" />
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-red-500/20 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute -bottom-8 -left-8 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />

          {/* Glass card */}
          <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20">
            {/* Icon and Title */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-red-500 to-orange-500 shadow-xl shadow-red-500/50 animate-bounce mb-3 sm:mb-4">
                <span className="text-4xl sm:text-5xl">⚠️</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">
                Ad Blocker Detected
              </h2>
              <div className="h-1 w-24 sm:w-32 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 mx-auto rounded-full shadow-lg" />
            </div>

            {/* Message Box */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-5 mb-4 sm:mb-5 border border-white/20 shadow-inner">
              <p className="text-white text-base sm:text-lg leading-relaxed text-center mb-3">
                We noticed you're using an{" "}
                <span className="font-bold text-yellow-300">ad blocker</span>.
              </p>
              <p className="text-white/90 text-sm sm:text-base leading-relaxed text-center mb-4">
                Our free tools are made possible by ads. They help us:
              </p>

              {/* Benefits list */}
              <div className="space-y-2 sm:space-y-3 mb-4">
                <div className="flex items-center gap-2 sm:gap-3 bg-white/5 rounded-xl p-2.5 sm:p-3">
                  <span className="text-xl sm:text-2xl">💰</span>
                  <span className="text-white/90 text-xs sm:text-sm">
                    Keep all tools{" "}
                    <strong className="text-green-300">100% free</strong>{" "}
                    forever
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 bg-white/5 rounded-xl p-2.5 sm:p-3">
                  <span className="text-xl sm:text-2xl">🔧</span>
                  <span className="text-white/90 text-xs sm:text-sm">
                    Maintain servers & add{" "}
                    <strong className="text-blue-300">new features</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 bg-white/5 rounded-xl p-2.5 sm:p-3">
                  <span className="text-xl sm:text-2xl">👥</span>
                  <span className="text-white/90 text-xs sm:text-sm">
                    Support our small team of{" "}
                    <strong className="text-purple-300">developers</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-yellow-300 text-xs sm:text-sm font-semibold bg-yellow-500/10 rounded-lg py-2 px-3 sm:px-4">
                <span>⚡</span>
                <span>Takes 5 seconds • Supports us for years</span>
                <span>⚡</span>
              </div>
            </div>

            {/* Call to Action */}
            <button
              onClick={verifyAdBlockDisabled}
              className="w-full bg-gradient-to-r from-red-500 via-orange-500 to-red-500 text-white font-black text-base sm:text-lg py-3 sm:py-4 px-4 sm:px-6 rounded-xl shadow-2xl shadow-red-500/40 hover:shadow-red-500/60 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 sm:gap-3 group"
            >
              <span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform">
                ✅
              </span>
              <span>I've Disabled It - Verify Now</span>
            </button>

            {/* Help text */}
            <p className="text-center text-white/60 text-xs mt-3 sm:mt-4 leading-relaxed">
              We'll verify that your ad blocker is disabled
            </p>

            {/* Footer */}
            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/10">
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
