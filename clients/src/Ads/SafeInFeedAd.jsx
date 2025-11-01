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

    const isSmallScreen = window.innerWidth < 480;
    if (isSmallScreen) {
      setShowAd(false);
      return;
    }

    const checkAdRendered = () => {
      if (!ref.current || ref.current.offsetHeight < 100) {
        retryTimeoutRef.current = setTimeout(() => {
          if (!ref.current || ref.current.offsetHeight < 100) {
            setFallback(true);
            setTimeout(() => {
              if (ref.current && ref.current.offsetHeight < 100) {
                setShowAd(false);
              }
            }, 2000);
          }
        }, 1000);
      }
    };

    const initialTimeout = setTimeout(checkAdRendered, 4000);

    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(retryTimeoutRef.current);
    };
  }, [isAdBlocked]);

  if (!showAd) return null;

  return (
    <div ref={ref} className="w-full h-full flex flex-col">
      {fallback ? <CardAd postId={postId} /> : <InFeedAd postId={postId} />}
    </div>
  );
};

export default SafeInFeedAd;
