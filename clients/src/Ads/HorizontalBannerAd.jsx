import React, { useEffect, useRef } from "react";

const HorizontalBannerAd = () => {
  const adRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.warn("[HorizontalBannerAd] Ad push error:", e);
      }
    }
  }, []);

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-md shadow-sm p-3 overflow-hidden">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1 text-center uppercase tracking-wide font-medium">
        Sponsored
      </p>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-8408980890451581"
        data-ad-slot="2355207118"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default HorizontalBannerAd;
