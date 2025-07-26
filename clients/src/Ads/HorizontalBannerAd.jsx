import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { selectSocketState } from "../store/socketSlice";
import useAdBlockDetector from "./useAdBlockDetector";

const HorizontalBannerAd = ({ postId }) => {
  const adRef = useRef(null);
  const impressionSent = useRef(false);
  const isAdBlocked = useAdBlockDetector();
  const { socketInstance } = useSelector(selectSocketState);

  // Track ad visibility and send impression
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      isAdBlocked ||
      impressionSent.current ||
      !socketInstance?.connected
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impressionSent.current) {
          impressionSent.current = true;

          // Emit impression to backend or via socket
          if (postId) {
            socketInstance.emit("adImpression", {
              postId,
              adIndex: "horizontal",
              adSlot: "2355207118",
              timeSpent: 30,
            });
          }

          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          } catch (e) {
            console.warn("[HorizontalBannerAd] Ad push error:", e);
          }
        }
      },
      { threshold: 0.1 }
    );

    if (adRef.current) observer.observe(adRef.current);
    return () => observer.disconnect();
  }, [postId, isAdBlocked, socketInstance]);

  return (
    <div className="flex justify-center w-full">
      <div className="w-full max-w-screen-xl bg-white dark:bg-gray-800 rounded-md shadow-sm p-3 overflow-hidden">
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1 text-center uppercase tracking-wide font-medium">
          Sponsored
        </p>
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: "block", width: "100%" }}
          data-ad-client="ca-pub-8408980890451581"
          data-ad-slot="2355207118"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
};

export default HorizontalBannerAd;
