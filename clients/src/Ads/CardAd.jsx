import React from "react";
import GoogleAd from "./GoogleAd";

/**
 * Displays a card-style Google Ad within post grid
 */
const CardAd = ({ postId }) => {
  return (
    <div className="w-full h-full p-2 bg-white dark:bg-gray-800 rounded-lg shadow">
      <GoogleAd
        adSlot="3793794759" // your card-specific ad slot
        adFormat="auto"
        postId={postId}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic text-center">
        Sponsored
      </p>
    </div>
  );
};

export default CardAd;
