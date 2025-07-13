// src/components/Post/DisplayPost/SubscriptionBanner.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const SubscriptionBanner = ({ showSeeMore, post }) => {
  const navigate = useNavigate();
  if (!showSeeMore) return null;
  return (
    <div className="mt-6 p-6 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-2xl text-center shadow-xl animate-fade-in border border-gray-300 dark:border-gray-700">
      <p className="text-white text-lg font-semibold mb-4">
        Unlock this story with a subscription
      </p>
      <button
        onClick={() => navigate(`/login?redirect=/post/${post.slug}`)}
        className="px-6 py-2 rounded-full bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 shadow-md hover:shadow-lg"
      >
        Log In
      </button>
    </div>
  );
};

export default SubscriptionBanner;