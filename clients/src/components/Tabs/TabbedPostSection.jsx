import React, { useState } from "react";
import PostTabContent from "./PostTabContent";
import FollowingPosts from "./FollowingPosts";

const TabbedPostSection = () => {
  const [activeTab, setActiveTab] = useState("All Posts");

  const tabs = ["All Posts", "Following", "My Posts"];

  return (
    <div className="w-full">
      <div className="flex gap-6 px-20 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-4 rounded-full font-medium transition-colors duration-300 ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
            aria-pressed={activeTab === tab} // Accessibility improvement
          >
            {tab}
          </button>
        ))}
      </div>
      <hr className="mb-6 text-slate-300 mx-10" />

      <PostTabContent activeTab={activeTab} />
    </div>
  );
};

export default TabbedPostSection;
