import React from "react";
import GoogleAd from "./GoogleAd";

/**
 * Displays a card-style Google Ad within post grid
 */
const CardAd = ({ postId }) => {
  return (
    <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden h-full">
      <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-700">
        <GoogleAd
          adSlot="3793794759"
          adFormat="fluid"
          postId={postId}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            textAlign: "center",
          }}
        />
      </div>
      <div className="p-4 flex-grow flex flex-col items-center justify-center">
        <p className="text-sm text-gray-700 dark:text-gray-200 font-semibold text-center">
          Sponsored
        </p>
      </div>
    </div>
  );
};

export default CardAd;
