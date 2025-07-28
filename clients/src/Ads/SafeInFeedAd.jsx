import React, { useEffect, useRef, useState } from "react";
import InFeedAd from "./InFeedAd";
import CardAd from "./CardAd";

const SafeInFeedAd = ({ postId }) => {
  const ref = useRef(null);
  const [fallback, setFallback] = useState(false);
  const retryTimeoutRef = useRef(null); // To track retry timeout

  useEffect(() => {
    const checkAdRendered = () => {
      const el = ref.current;
      // console.log("[AdCheck] offsetHeight after 4s:", el?.offsetHeight);

      if (!el || el.offsetHeight < 4) {
        retryTimeoutRef.current = setTimeout(() => {
          const retryEl = ref.current;
          // console.log(
          //   "[AdRetryCheck] offsetHeight after retry:",
          //   retryEl?.offsetHeight
          // );

          if (!retryEl || retryEl.offsetHeight < 4) {
            setFallback(true);
          }
        }, 1000);
      }
    };

    const initialTimeout = setTimeout(checkAdRendered, 4000); // 10s wait

    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(retryTimeoutRef.current); // Cleanup retry timeout if unmounted
    };
  }, []);

  return (
    <div className="w-full" ref={ref}>
      {fallback ? <CardAd postId={postId} /> : <InFeedAd postId={postId} />}
    </div>
  );
};

export default SafeInFeedAd;
