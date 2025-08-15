import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { selectSocketState } from "../store/socketSlice";
import useAdBlockDetector from "./useAdBlockDetector";

const HorizontalBannerAd = ({ postId }) => {
  const adRef = useRef(null);
  const impressionSent = useRef(false);
  const isAdBlocked = useAdBlockDetector();
  const { socketInstance } = useSelector(selectSocketState);

  // Load the ad immediately (like your working HTML version)
  useEffect(() => {
    if (typeof window === "undefined" || !adRef.current || isAdBlocked) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn("[HorizontalBannerAd] Ad push error:", e);
    }
  }, [isAdBlocked]);

  // Track impressions when the ad comes into view
  useEffect(() => {
    if (!adRef.current || isAdBlocked || impressionSent.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impressionSent.current) {
          impressionSent.current = true;

          if (postId && socketInstance?.connected) {
            socketInstance.emit("adImpression", {
              postId,
              adIndex: "horizontal",
              adSlot: "2355207118",
              timeSpent: 30,
            });
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(adRef.current);
    return () => observer.disconnect();
  }, [postId, isAdBlocked, socketInstance]);

  return (
    <div className="flex justify-center w-full">
      <div className="w-full max-w-screen-xl bg-white dark:bg-gray-800 rounded-md shadow-sm p-3 overflow-hidden">
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1 text-center uppercase tracking-wide font-medium">
          Sponsored
        </p>
        {isAdBlocked ? (
          <div className="w-full h-[90px] bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded">
            <img
              src="https://placehold.co/728x90?text=Ad+Blocked"
              alt="Ad Blocked"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{ display: "block", width: "100%" }}
            data-ad-client="ca-pub-8408980890451581"
            data-ad-slot="2355207118"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        )}
      </div>
    </div>
  );
};

export default HorizontalBannerAd;
