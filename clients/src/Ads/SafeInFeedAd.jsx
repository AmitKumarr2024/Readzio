import React, { useEffect, useRef, useState } from "react";
import InFeedAd from "./InFeedAd";
import CardAd from "./CardAd";

const SafeInFeedAd = ({ postId }) => {
  const ref = useRef(null);
  const [fallback, setFallback] = useState(false);
  const retryTimeoutRef = useRef(null);

  useEffect(() => {
    const isSmallScreen = window.innerWidth < 480;
    if (isSmallScreen) {
      setFallback(true);
      return;
    }

    const checkAdRendered = () => {
      const el = ref.current;
      if (!el || el.offsetHeight < 4) {
        retryTimeoutRef.current = setTimeout(() => {
          const retryEl = ref.current;
          if (!retryEl || retryEl.offsetHeight < 4) {
            setFallback(true);
          }
        }, 1000);
      }
    };

    const initialTimeout = setTimeout(checkAdRendered, 4000);

    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  return (
    <div className="w-full" ref={ref}>
      {fallback ? <CardAd postId={postId} /> : <InFeedAd postId={postId} />}
    </div>
  );
};

export default SafeInFeedAd;
