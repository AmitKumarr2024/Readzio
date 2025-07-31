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
      <div className="w-full max-w-[728px] flex flex-col items-center">
        {isAdBlocked ? (
          <div className="w-full h-[90px] bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded">
            <img
              src="https://placehold.co/728x90?text=Ad+Blocked"
              alt="Ad Blocked"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <>
            <div className="w-full h-[90px] overflow-hidden flex justify-center items-center">
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
                  overflow: "hidden",
                }}
                data-ad-client="ca-pub-8408980890451581"
                data-ad-slot="4935470124"
                data-ad-format="auto"
                data-ad-layout="in-article"
                data-full-width-responsive="false"
              />
            </div>
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
