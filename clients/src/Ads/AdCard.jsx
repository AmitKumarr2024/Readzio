import React from "react";
import SafeInFeedAd from "./SafeInFeedAd";

const AdCard = ({ postId }) => (
  <div className="group relative bg-white dark:bg-slate-900 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-slate-800 h-full">
    <SafeInFeedAd postId={postId} />
  </div>
);

export default AdCard;
