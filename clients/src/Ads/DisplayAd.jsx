import React, { useEffect, useRef, useState } from "react";
import AdGuard from "./adsGaurd/AdGuard";

const GoogleAd = ({ adClient, adSlot, adFormat = "auto", style }) => {
  const adRef = useRef(null);
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    if (!adRef.current) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.warn("[GoogleAd] Ad push failed", err);
    }

    // Check if ad rendered
    const timeout = setTimeout(() => {
      if (adRef.current && adRef.current.offsetHeight > 0) {
        setAdLoaded(true);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, []);

  if (!adLoaded) return null;

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={style}
      data-ad-client={adClient || "ca-pub-8408980890451581"}
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive="true"
    />
  );
};

const DisplayAd = () => (
  <AdGuard placement="horizontal">
    <div className="flex flex-col items-center my-4">
      <GoogleAd
        adSlot="6440123489"
        adFormat="auto" // auto format works for vertical or horizontal
        style={{
          display: "block",
          width: "100%", // container width
          maxWidth: "300px", // max width for vertical ad
          height: "600px", // vertical ad height
          minHeight: "300px", // fallback height
        }}
      />
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
        Sponsored
      </p>
    </div>
  </AdGuard>
);

export default DisplayAd;
