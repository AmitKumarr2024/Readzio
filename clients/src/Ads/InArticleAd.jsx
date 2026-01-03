import React, { useEffect, useRef, useState } from "react";
import useAdBlockDetector from "./useAdBlockDetector";
import { useSelector } from "react-redux";
import { selectSocketState } from "../store/socketSlice";

const InArticleAd = ({ postId, adIndex = 0 }) => {
  const adRef = useRef(null);
  const impressionSent = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const isAdBlocked = useAdBlockDetector();
  const { socketInstance } = useSelector(selectSocketState);

  // Load the ad only once on mount
  useEffect(() => {
    if (typeof window === "undefined" || !adRef.current || isAdBlocked) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      setIsVisible(true);
    } catch (err) {
      console.warn("[InArticleAd] Initial ad push failed", err);
    }
  }, [isAdBlocked]);

  // Track impressions via IntersectionObserver
  useEffect(() => {
    if (!adRef.current || isAdBlocked || impressionSent.current || !isVisible)
      return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impressionSent.current) {
          impressionSent.current = true;

          if (postId && socketInstance?.connected) {
            socketInstance.emit("adImpression", {
              postId,
              adSlot: "4935470124",
              adIndex: `in-article-${adIndex}`,
              timeSpent: 30,
            });
          }
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(adRef.current);
    return () => observer.disconnect();
  }, [isAdBlocked, socketInstance, postId, adIndex, isVisible]);

  // Don't render if ad blocked
  if (isAdBlocked) return null;

  return (
    <div className="in-article-ad w-full my-6 sm:my-8 flex justify-center">
      <div className="w-full max-w-[728px]">
        {/* Simple "Sponsored" Label */}
        <div className="text-center mb-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Sponsored
          </span>
        </div>

        {/* Ad Container */}
        <div className="w-full min-h-[90px] flex justify-center items-center">
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{
              display: "block",
              width: "100%",
              minHeight: "90px",
              textAlign: "center",
            }}
            data-ad-client="ca-pub-8408980890451581"
            data-ad-slot="4935470124"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    </div>
  );
};

export default InArticleAd;

// old code
// import React, { useEffect, useRef, useState } from "react";
// import useAdBlockDetector from "./useAdBlockDetector";
// import { useSelector } from "react-redux";
// import { selectSocketState } from "../store/socketSlice";

// const InArticleAd = ({ postId }) => {
//   const adRef = useRef(null);
//   const impressionSent = useRef(false);
//   const [adLoaded, setAdLoaded] = useState(false); // Track if ad loaded
//   const isAdBlocked = useAdBlockDetector();
//   const { socketInstance } = useSelector(selectSocketState);

//   // Load the ad only once on mount
//   useEffect(() => {
//     if (typeof window === "undefined" || !adRef.current || isAdBlocked) return;

//     try {
//       (window.adsbygoogle = window.adsbygoogle || []).push({});
//     } catch (err) {
//       console.warn("[InArticleAd] Initial ad push failed", err);
//     }

//     // Check if ad actually rendered after 500ms
//     const checkInterval = setInterval(() => {
//       if (adRef.current?.offsetHeight > 0) {
//         setAdLoaded(true);
//         clearInterval(checkInterval);
//       }
//     }, 300);

//     setTimeout(() => clearInterval(checkInterval), 3000);

//     return () => clearTimeout(timeout);
//   }, [isAdBlocked]);

//   // Track impressions via IntersectionObserver
//   useEffect(() => {
//     if (!adRef.current || isAdBlocked || impressionSent.current) return;

//     const observer = new IntersectionObserver(
//       ([entry]) => {
//         if (entry.isIntersecting && !impressionSent.current) {
//           impressionSent.current = true;

//           if (postId && socketInstance?.connected) {
//             socketInstance.emit("adImpression", {
//               postId,
//               adSlot: "4935470124",
//               adIndex: "in-article",
//               timeSpent: 30,
//             });
//           }
//         }
//       },
//       { threshold: 0.25 }
//     );

//     observer.observe(adRef.current);
//     return () => observer.disconnect();
//   }, [isAdBlocked, socketInstance, postId]);

//   // Only show if ad loaded
//   if (isAdBlocked || !adLoaded) return null;

//   return (
//     <div className="in-article-ad w-full my-6 flex justify-center">
//       <div className="w-full max-w-[728px] flex flex-col items-center">
//         <div className="w-full overflow-hidden flex justify-center items-center min-h-[90px]">
//           <ins
//             ref={adRef}
//             className="adsbygoogle"
//             style={{
//               display: "block",
//               width: "100%", // flexible width
//               height: "auto", // flexible height
//               textAlign: "center",
//             }}
//             data-ad-client="ca-pub-8408980890451581"
//             data-ad-slot="4935470124"
//             data-ad-format="auto" // auto format
//             data-full-width-responsive="true"
//           />
//         </div>
//         <p className="mt-1 text-xs text-start italic text-gray-500 dark:text-gray-400">
//           Sponsored
//         </p>
//       </div>
//     </div>
//   );
// };

// export default InArticleAd;
