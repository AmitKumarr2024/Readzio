import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectSocketState } from "../store/socketSlice";
import useAdBlockDetector from "./useAdBlockDetector";

const HorizontalBannerAd = ({ postId }) => {
  const adRef = useRef(null);
  const impressionSent = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const isAdBlocked = useAdBlockDetector();
  const { socketInstance } = useSelector(selectSocketState);

  // Load the ad immediately
  useEffect(() => {
    if (typeof window === "undefined" || !adRef.current || isAdBlocked) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      setIsVisible(true);
    } catch (e) {
      console.warn("[HorizontalBannerAd] Ad push error:", e);
    }
  }, [isAdBlocked]);

  // Track impressions when the ad comes into view
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
              adIndex: "horizontal-banner",
              adSlot: "2355207118",
              timeSpent: 30,
            });
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(adRef.current);
    return () => observer.disconnect();
  }, [postId, isAdBlocked, socketInstance, isVisible]);

  // Don't render anything if ad is blocked
  if (isAdBlocked) return null;

  return (
    <div className="w-full my-6 sm:my-8">
      {/* Simple "Sponsored" Label */}
      <div className="text-center mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Sponsored
        </span>
      </div>

      {/* Ad Container - Clean and Simple */}
      <div className="w-full flex justify-center">
        <div className="w-full max-w-[728px]">
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{
              display: "block",
              width: "100%",
              minHeight: "90px",
            }}
            data-ad-client="ca-pub-8408980890451581"
            data-ad-slot="2355207118"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    </div>
  );
};

export default HorizontalBannerAd;

// old code
// import React, { useEffect, useRef } from "react";
// import { useSelector } from "react-redux";
// import { selectSocketState } from "../store/socketSlice";
// import useAdBlockDetector from "./useAdBlockDetector";

// const HorizontalBannerAd = ({ postId }) => {
//   const adRef = useRef(null);
//   const impressionSent = useRef(false);
//   const isAdBlocked = useAdBlockDetector();
//   const { socketInstance } = useSelector(selectSocketState);

//   // Load the ad immediately (like your working HTML version)
//   useEffect(() => {
//     if (typeof window === "undefined" || !adRef.current || isAdBlocked) return;

//     try {
//       (window.adsbygoogle = window.adsbygoogle || []).push({});
//     } catch (e) {
//       console.warn("[HorizontalBannerAd] Ad push error:", e);
//     }
//   }, [isAdBlocked]);

//   // Track impressions when the ad comes into view
//   useEffect(() => {
//     if (!adRef.current || isAdBlocked || impressionSent.current) return;

//     const observer = new IntersectionObserver(
//       ([entry]) => {
//         if (entry.isIntersecting && !impressionSent.current) {
//           impressionSent.current = true;

//           if (postId && socketInstance?.connected) {
//             socketInstance.emit("adImpression", {
//               postId,
//               adIndex: "horizontal",
//               adSlot: "2355207118",
//               timeSpent: 30,
//             });
//           }
//         }
//       },
//       { threshold: 0.1 }
//     );

//     observer.observe(adRef.current);
//     return () => observer.disconnect();
//   }, [postId, isAdBlocked, socketInstance]);

//   return (
//     <div className="w-full px-2 sm:px-4 lg:px-6">
//       <div className="mx-auto max-w-full">
//         {/* Container with responsive padding and background */}
//         <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
//           {/* Sponsored Label */}
//           <div className="px-4 pt-3 pb-2">
//             <span className="inline-block px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 text-xs font-semibold rounded-md uppercase tracking-wide">
//               Sponsored
//             </span>
//           </div>

//           {/* Ad Container - Responsive for all screen sizes */}
//           <div className="px-4 pb-4">
//             {isAdBlocked ? (
//               // Ad Blocked Placeholder - Responsive
//               <div className="w-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
//                 <div className="py-12 sm:py-16 md:py-20 text-center px-4">
//                   <div className="w-16 h-16 mx-auto mb-4 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
//                     <svg
//                       className="w-8 h-8 text-gray-500 dark:text-gray-400"
//                       fill="none"
//                       stroke="currentColor"
//                       viewBox="0 0 24 24"
//                     >
//                       <path
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                         strokeWidth={2}
//                         d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
//                       />
//                     </svg>
//                   </div>
//                   <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
//                     Ad Blocked
//                   </p>
//                   <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
//                     Please disable your ad blocker to support us
//                   </p>
//                 </div>
//               </div>
//             ) : (
//               // Google AdSense - Fully Responsive
//               <div className="w-full overflow-hidden rounded-lg">
//                 <ins
//                   ref={adRef}
//                   className="adsbygoogle"
//                   style={{
//                     display: "block",
//                     width: "100%",
//                     minHeight: "90px",
//                     maxHeight: "250px",
//                   }}
//                   data-ad-client="ca-pub-8408980890451581"
//                   data-ad-slot="2355207118"
//                   data-ad-format="auto"
//                   data-full-width-responsive="true"
//                 />
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default HorizontalBannerAd;
