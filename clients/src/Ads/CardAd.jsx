import React, { useEffect, useRef, useState } from "react";
import GoogleAd from "./GoogleAd";

const CardAd = ({ postId }) => {
  const adRef = useRef(null);
  const [showAd, setShowAd] = useState(true);

  useEffect(() => {
    if (!adRef.current) return;
    setTimeout(() => {
      if (adRef.current && adRef.current.offsetHeight < 100) {
        setShowAd(false);
      }
    }, 3000);
  }, []);

  if (!showAd) return null;

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 overflow-hidden h-full">
      <div className="relative w-full aspect-video">
        <div ref={adRef}>
          <GoogleAd
            adSlot="3793794759"
            adFormat="fluid"
            postId={postId}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
            }}
          />
        </div>
      </div>
      <div className="p-6 flex-grow">
        {" "}
        {/* Match CardOfPost p-6 */}
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium text-center">
          Sponsored
        </p>
      </div>
    </div>
  );
};

export default CardAd;
