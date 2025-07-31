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
    if (typeof window === "undefined" || !adRef.current || isAdBlocked) return;
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
    <div className="in-article-ad w-full my-6 flex justify-center">
      <div className="w-full max-w-[728px] h-[90px] overflow-hidden flex justify-center items-center">
        {isAdBlocked ? (
          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded">
            <span className="text-gray-600 dark:text-gray-300 text-sm">
              Ad Blocked
            </span>
          </div>
        ) : (
          <>
            <ins
              ref={adRef}
              className="adsbygoogle"
              style={{
                display: "block",
                position: "static !important",
                top: "auto !important",
                left: "auto !important",
                width: "100%",
                height: "90px",
                textAlign: "center",
              }}
              data-ad-client="ca-pub-8408980890451581"
              data-ad-slot="4935470124"
              data-ad-format="auto"
              data-ad-layout="in-article"
              data-full-width-responsive="false"
            />
            <p className="mt-1 text-xs text-center italic text-gray-500 dark:text-gray-400">
              Sponsored
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default InArticleAd;
