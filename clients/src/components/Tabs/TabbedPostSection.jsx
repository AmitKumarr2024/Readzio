import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import PostTabContent from "./PostTabContent";
import { selectSocketState } from "../../store/socketSlice";

const formatNumber = (num) => {
  if (num < 1000) return num;
  if (num < 1_000_000) return `${(num / 1000).toFixed(num >= 10_000 ? 0 : 1)}K`;
  if (num < 1_000_000_000)
    return `${(num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1)}M`;
  return `${(num / 1_000_000_000).toFixed(num >= 10_000_000_000 ? 0 : 1)}B`;
};

const TabbedPostSection = ({ user, posts = [], loading }) => {
  const [activeTab, setActiveTab] = useState("All Posts");
  const { postCounts } = useSelector(selectSocketState);
  const isAuthenticated = !!user;

  const tabs = isAuthenticated
    ? ["All Posts", "Following", "My Posts"]
    : ["All Posts"];

  const getTabCount = (tab) => {
    switch (tab) {
      case "All Posts":
        return formatNumber(postCounts.allPostsCount || 0);
      case "Following":
        return formatNumber(postCounts.followingPostsCount || 0);
      case "My Posts":
        return formatNumber(postCounts.myPostsCount || 0);
      default:
        return "0";
    }
  };

  // Refs for dynamic underline
  const tabRefs = useRef({});
  const underlineRef = useRef();

  useEffect(() => {
    const activeEl = tabRefs.current[activeTab];
    const underline = underlineRef.current;

    if (activeEl && underline) {
      const rect = activeEl.getBoundingClientRect();
      const parentRect = activeEl.parentElement.getBoundingClientRect();

      underline.style.width = `${rect.width}px`;
      underline.style.transform = `translateX(${
        rect.left - parentRect.left
      }px)`;
    }
  }, [activeTab, tabs]);

  return (
    <div className="w-full  bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      {/* Tabs */}
      <div className="relative  h-16  flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto no-scrollbar px-4 sm:px-6 md:px-8 mb-4 border-b border-gray-300 dark:border-gray-700">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          const count = getTabCount(tab);

          return (
            <button
              key={tab}
              ref={(el) => (tabRefs.current[tab] = el)}
              onClick={() => setActiveTab(tab)}
              className={`relative whitespace-nowrap py-2.5 px-5 font-semibold text-sm sm:text-base transition-all rounded-md ${
                isActive
                  ? "text-primary-light dark:text-primary-dark"
                  : "text-text-main-light dark:text-text-main-dark hover:text-primary-light"
              }`}
            >
              {tab}
              {count !== "0" && (
                <span className="absolute top-1 -right-3 min-w-[20px] px-2 py-0.5 text-[15px] font-medium bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-full shadow ring-1 ring-gray-200 dark:ring-gray-700">
                  {count}
                </span>
              )}
            </button>
          );
        })}
        {/* Dynamic underline */}
        <span
          ref={underlineRef}
          className="absolute bottom-0 left-0 h-1 bg-primary-light dark:bg-primary-dark transition-all duration-300 ease-in-out"
          style={{ width: 0 }}
        />
      </div>

      {/* Tab Content */}
      <PostTabContent
        activeTab={activeTab}
        posts={posts}
        user={user}
        loading={loading}
      />
    </div>
  );
};

export default TabbedPostSection;
