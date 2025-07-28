import React, { useEffect, useRef } from "react";
import useAdBlockDetector from "./useAdBlockDetector";
import { useSelector } from "react-redux";
import { selectSocketState } from "../store/socketSlice";

const InArticleAd = ({ postId }) => {
  const adRef = useRef(null);
  const impressionSent = useRef(false);
  const isAdBlocked = useAdBlockDetector();
  const { socketInstance } = useSelector(selectSocketState);

  useEffect(() => {
    if (typeof window === "undefined" || !adRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.warn("[InArticleAd] Initial ad push failed", err);
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
              adSlot: "4935470124",
              adIndex: "in-article",
              timeSpent: 30,
            });
          }

          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          } catch (err) {
            console.warn("[InArticleAd] View-triggered ad push failed", err);
          }
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(adRef.current);
    return () => observer.disconnect();
  }, [isAdBlocked, socketInstance, postId]);

  return (
    <div className="w-full flex justify-center my-6">
      <div
        className="w-full"
        style={{
          maxWidth: "700px",
          textAlign: "center", // Optional for outer div
        }}
      >
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: "block", textAlign: "center" }}
          data-ad-client="ca-pub-8408980890451581"
          data-ad-slot="4935470124"
          data-ad-format="fluid"
          data-ad-layout="in-article"
          data-full-width-responsive="true"
        />
        <p className="mt-1 text-xs text-center italic text-gray-500 dark:text-gray-400">
          Sponsored
        </p>
      </div>
    </div>
  );
};

export default InArticleAd;
