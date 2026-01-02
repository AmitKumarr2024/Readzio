import React, { useEffect, useRef, useState } from "react";
import InFeedAd from "./InFeedAd";
import CardAd from "./CardAd";
import useAdBlockDetector from "./useAdBlockDetector";
import AdGuard from "./adsGaurd/AdGuard";

const SafeInFeedAd = ({ postId }) => {
  const containerRef = useRef(null);
  const isAdBlocked = useAdBlockDetector();
  const [canRender, setCanRender] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    if (isAdBlocked) return;

    const checkWidth = () => {
      const width = containerRef.current?.offsetWidth || 0;

      if (width >= 250) {
        setCanRender(true);
      } else {
        setUseFallback(true);
      }
    };

    const t = setTimeout(checkWidth, 500);
    return () => clearTimeout(t);
  }, [isAdBlocked]);

  if (isAdBlocked || (!canRender && !useFallback)) return null;

  return (
    <AdGuard placement="inFeed">
      <div
        ref={containerRef}
        className="w-full flex flex-col items-center"
        style={{ minWidth: 250, maxWidth: 728 }}
      >
        {useFallback ? (
          <CardAd postId={postId} />
        ) : (
          <div className="w-full">
            <div className="w-full min-h-[120px]">
              <InFeedAd postId={postId} />
            </div>

            {/* ✅ Sponsored label – SAFE */}
            <p className="mt-2 text-xs italic text-gray-500 dark:text-gray-400 text-center">
              Sponsored
            </p>
          </div>
        )}
      </div>
    </AdGuard>
  );
};

export default SafeInFeedAd;
