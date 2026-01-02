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
    if (!adRef.current || isAdBlocked) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.warn("[InFeedAd] adsbygoogle push failed", err);
    }
  }, [isAdBlocked]);

  useEffect(() => {
    if (!adRef.current || isAdBlocked || impressionSent.current) return;

    const observer = new IntersectionObserver(([entry]) => {
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
    });

    observer.observe(adRef.current);
    return () => observer.disconnect();
  }, [isAdBlocked, socketInstance, postId]);

  if (isAdBlocked) return null;

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={{ display: "block", width: "100%" }}
      data-ad-client="ca-pub-8408980890451581"
      data-ad-slot="8028537328"
      data-ad-format="fluid"
      data-ad-layout-key="-6t+ed+2i-1n-4w"
      data-full-width-responsive="true"
    />
  );
};

export default InFeedAd;
