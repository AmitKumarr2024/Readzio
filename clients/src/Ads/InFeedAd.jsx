import React, { useEffect, useRef } from "react";
import useAdBlockDetector from "./useAdBlockDetector";
import { useSelector } from "react-redux";
import { selectSocketState } from "../store/socketSlice";

const InFeedAd = ({ postId }) => {
  const adRef = useRef(null);
  const impressionSent = useRef(false);
  const isAdBlocked = useAdBlockDetector();
  const { socketInstance } = useSelector(selectSocketState);

  useEffect(() => {
    if (typeof window === "undefined" || !adRef.current) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.warn("[InFeedAd] Initial ad push failed", err);
    }
  }, []);

  useEffect(() => {
    if (!adRef.current || isAdBlocked || impressionSent.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impressionSent.current) {
          impressionSent.current = true;

          if (postId && socketInstance?.connected) {
            socketInstance.emit("adImpression", {
              postId,
              adSlot: "8028537328",
              adIndex: "in-feed",
              timeSpent: 30,
            });
          }
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(adRef.current);
    return () => observer.disconnect();
  }, [isAdBlocked, socketInstance, postId]);

  return (
    <div className="w-full flex justify-center overflow-hidden">
      <div
        className="bg-white dark:bg-gray-800 rounded-md shadow border p-3"
        style={{
          minWidth: "250px",
          width: "100%",
          maxWidth: "600px", // Optional: limits ad width on large screens
        }}
      >
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{
            display: "block",
            width: "100%",
            minWidth: "250px",
          }}
          data-ad-client="ca-pub-8408980890451581"
          data-ad-slot="8028537328"
          data-ad-format="fluid"
          data-full-width-responsive="true"
        />
        <p className="mt-2 text-xs text-center italic text-gray-500 dark:text-gray-400">
          Sponsored
        </p>
      </div>
    </div>
  );
};

export default InFeedAd;
