import React, { useState } from "react";
import PostTabContent from "./PostTabContent";
import FollowingPosts from "./FollowingPosts";

const TabbedPostSection = () => {
  const [activeTab, setActiveTab] = useState("All Posts");

  const tabs = ["All Posts", "Following", "My Posts"];

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto px-4 sm:px-6 md:px-8 mb-4 no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap py-2 px-4 rounded-full font-medium text-sm sm:text-base transition-colors duration-300 ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
            aria-pressed={activeTab === tab}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Divider */}
      <hr className="mb-6 border-slate-800 mx-4 sm:mx-6 md:mx-8" />

      {/* Tab Content */}
      <PostTabContent activeTab={activeTab} />
    </div>
  );
};

export default TabbedPostSection;
