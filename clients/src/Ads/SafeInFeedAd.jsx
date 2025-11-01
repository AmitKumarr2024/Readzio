import React, { useEffect, useRef, useState } from "react";
import InFeedAd from "./InFeedAd";
import CardAd from "./CardAd";
import useAdBlockDetector from "./useAdBlockDetector";

const SafeInFeedAd = ({ postId }) => {
  const ref = useRef(null);
  const [showAd, setShowAd] = useState(true);
  const [fallback, setFallback] = useState(false);
  const retryTimeoutRef = useRef(null);
  const isAdBlocked = useAdBlockDetector();

  useEffect(() => {
    if (isAdBlocked) {
      setShowAd(false);
      return;
    }

    // ✅ Don't attempt rendering on very small screens
    if (window.innerWidth < 480) {
      setShowAd(false);
      return;
    }

    const checkAdRendered = () => {
      if (!ref.current || ref.current.offsetWidth < 250) {
        console.warn(
          "[SafeInFeedAd] Ad container too small (<250px), using fallback."
        );
        setFallback(true);
        setTimeout(() => {
          if (ref.current && ref.current.offsetHeight < 100) {
            setShowAd(false);
          }
        }, 2000);
      }
    };

    const initialTimeout = setTimeout(checkAdRendered, 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(retryTimeoutRef.current);
    };
  }, [isAdBlocked]);

  // ✅ If ads are blocked or not to be shown, render fallback ad component
  if (!showAd) return null;

  return (
    <div ref={ref} className="w-full h-full flex flex-col">
      {fallback ? <CardAd postId={postId} /> : <InFeedAd postId={postId} />}
    </div>
  );
};

export default SafeInFeedAd;
