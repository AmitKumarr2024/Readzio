import React, { useState, useRef, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import PostTabContent from "./PostTabContent";
import { selectSocketState } from "../../store/socketSlice";

const formatNumber = (num) => {
  if (!num || num === 0) return "0";
  if (num < 1000) return num.toString();
  if (num < 1_000_000) return `${(num / 1000).toFixed(num >= 10_000 ? 0 : 1)}K`;
  if (num < 1_000_000_000)
    return `${(num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1)}M`;
  return `${(num / 1_000_000_000).toFixed(num >= 10_000_000_000 ? 0 : 1)}B`;
};

const TabbedPostSection = ({
  user,
  posts = [],
  loading,
  // Add these new props for different post types
  followingPosts = [],
  myPosts = [],
  // Or add callback functions to fetch data for each tab
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState("All Posts");
  const { postCounts } = useSelector(selectSocketState);
  const isAuthenticated = !!user;

  const tabs = isAuthenticated
    ? ["All Posts", "Following", "My Posts"]
    : ["All Posts"];

  const getTabCount = (tab) => {
    switch (tab) {
      case "All Posts":
        return formatNumber(postCounts?.allPostsCount || 0);
      case "Following":
        return formatNumber(postCounts?.followingPostsCount || 0);
      case "My Posts":
        return formatNumber(postCounts?.myPostsCount || 0);
      default:
        return "0";
    }
  };

  // Filter posts based on active tab
  const filteredPosts = useMemo(() => {
    switch (activeTab) {
      case "All Posts":
        return posts;
      case "Following":
        // Return following posts if provided, otherwise filter from all posts
        return followingPosts.length > 0
          ? followingPosts
          : posts.filter(
              (post) => post.isFromFollowing || post.author?.isFollowed
            );
      case "My Posts":
        // Return my posts if provided, otherwise filter from all posts
        return myPosts.length > 0
          ? myPosts
          : posts.filter(
              (post) => post.author?.id === user?.id || post.userId === user?.id
            );
      default:
        return posts;
    }
  }, [activeTab, posts, followingPosts, myPosts, user?.id]);

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Call callback if provided (for parent to fetch specific data)
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Refs for dynamic underline
  const tabRefs = useRef({});
  const underlineRef = useRef();

  useEffect(() => {
    const updateUnderline = () => {
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
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(updateUnderline, 10);

    // Also update on resize
    const handleResize = () => updateUnderline();
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [activeTab, tabs]);

  return (
    <div className="w-full bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      {/* Tabs */}
      <div className="relative h-16 flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto no-scrollbar px-4 sm:px-6 md:px-8 mb-4 border-b border-gray-300 dark:border-gray-700 tabbed-post-section">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          const count = getTabCount(tab);

          return (
            <button
              key={tab}
              ref={(el) => (tabRefs.current[tab] = el)}
              onClick={() => handleTabChange(tab)}
              className={`relative whitespace-nowrap py-2.5 px-5 font-semibold text-sm sm:text-base transition-all rounded-md ${
                isActive
                  ? "text-primary-light dark:text-primary-dark"
                  : "text-text-main-light dark:text-text-main-dark hover:text-primary-light dark:hover:text-primary-dark"
              }`}
            >
              {tab}
              {count !== "0" && (
                <span className="absolute top-1 -right-3 min-w-[20px] px-2 py-0.5 text-xs font-medium bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-full shadow ring-1 ring-gray-200 dark:ring-gray-700">
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

      {/* Tab Content - Now passes filtered posts */}
      <PostTabContent
        activeTab={activeTab}
        posts={filteredPosts}
        user={user}
        loading={loading}
      />
    </div>
  );
};

export default TabbedPostSection;
