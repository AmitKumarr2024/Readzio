import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import useAdBlockDetector from "./useAdBlockDetector";
import { selectSocketState } from "../store/socketSlice";

/**
 * Google AdSense component
 * Supports auto format, responsive, test mode, and impression tracking
 */
const GoogleAd = ({
  adSlot,
  adClient = "ca-pub-8408980890451581",
  adFormat = "auto",
  layoutKey = null,
  className = "",
  style = { display: "block", width: "100%" },
  postId = null,
  responsive = true,
  testMode = false,
}) => {
  const isAdBlocked = useAdBlockDetector();
  const { socketInstance } = useSelector(selectSocketState);
  const adRef = useRef(null);
  const impressionSent = useRef(false);

  // Push ads immediately (fallback for initial render)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      if (testMode || process.env.NODE_ENV !== "production") {
        console.warn("[GoogleAd] Initial ad push error:", e);
      }
    }
  }, []);

  // Track visibility + emit ad impression
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      isAdBlocked ||
      impressionSent.current ||
      !socketInstance?.connected
    )
      return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impressionSent.current) {
          impressionSent.current = true;

          if (postId) {
            socketInstance.emit("adImpression", {
              postId,
              adIndex: adSlot,
              adSlot,
              timeSpent: 30,
            });
          }

          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          } catch (e) {
            if (testMode || process.env.NODE_ENV !== "production") {
              console.warn("[GoogleAd] AdSense observer error:", e);
            }
          }
        }
      },
      { threshold: 0.1 }
    );

    if (adRef.current) observer.observe(adRef.current);
    return () => observer.disconnect();
  }, [adSlot, postId, isAdBlocked, socketInstance, testMode]);

  return (
    <ins
      ref={adRef}
      className={`adsbygoogle ${className}`}
      style={style}
      data-ad-client={adClient}
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      {...(layoutKey && { "data-ad-layout-key": layoutKey })}
      data-full-width-responsive={responsive ? "true" : "false"}
      {...(testMode && { "data-adtest": "on" })}
    />
  );
};

export default GoogleAd;
