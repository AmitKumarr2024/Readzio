// components/Ads/SafeInFeedAd.jsx
import React, { useEffect, useRef, useState } from "react";
import InFeedAd from "./InFeedAd";
import CardAd from "./CardAd";

const SafeInFeedAd = ({ postId }) => {
  const ref = useRef(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const el = ref.current;
      if (!el || el.offsetHeight < 50) {
        setFallback(true);
      }
    }, 2000); // Wait 2s to see if ad renders

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="w-full" ref={ref}>
      {fallback ? <CardAd postId={postId} /> : <InFeedAd postId={postId} />}
    </div>
  );
};

export default SafeInFeedAd;
