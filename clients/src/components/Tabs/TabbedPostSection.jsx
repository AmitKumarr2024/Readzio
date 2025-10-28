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
  followingPosts = [],
  myPosts = [],
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState("All Posts");
  const isAuthenticated = !!user;

  // Get socket post counts for real-time updates
  const { postCounts } = useSelector(selectSocketState);

  // Get Redux post state as fallback
  const reduxPosts = useSelector((state) => state.post.posts || []);
  const reduxFollowingPosts = useSelector(
    (state) => state.post.followingPosts || []
  );

  // Calculate My Posts count with real-time accuracy
  const myPostsCount = useMemo(() => {
    // If myPosts prop is provided, use its length
    if (myPosts.length > 0) return myPosts.length;

    const userId = user?._id || user?.id;
    if (!userId) return 0;

    // Use socket count if available, otherwise calculate from posts
    if (
      postCounts?.myPostsCount !== undefined &&
      postCounts.myPostsCount !== null
    ) {
      return postCounts.myPostsCount;
    }

    // Fallback: calculate from posts array
    const allPosts = posts.length > 0 ? posts : reduxPosts;
    return allPosts.filter((post) => {
      return (
        post.author === userId ||
        post.author?.toString() === userId ||
        (typeof post.author === "object" && post.author._id === userId) ||
        post.userId === userId ||
        post.createdBy === userId
      );
    }).length;
  }, [posts, myPosts, user, postCounts?.myPostsCount, reduxPosts]);

  const tabs = isAuthenticated
    ? ["All Posts", "Following", "My Posts"]
    : ["All Posts"];

  // Get tab count with real-time socket updates
  const getTabCount = (tab) => {
    switch (tab) {
      case "All Posts":
        // Priority: socket count > props length > redux length
        if (
          postCounts?.allPostsCount !== undefined &&
          postCounts.allPostsCount !== null
        ) {
          return formatNumber(postCounts.allPostsCount);
        }
        return formatNumber(posts.length || reduxPosts.length || 0);

      case "Following":
        // Priority: socket count > props length > redux length
        if (
          postCounts?.followingPostsCount !== undefined &&
          postCounts.followingPostsCount !== null
        ) {
          return formatNumber(postCounts.followingPostsCount);
        }
        return formatNumber(
          followingPosts.length || reduxFollowingPosts.length || 0
        );

      case "My Posts":
        return formatNumber(myPostsCount);

      default:
        return "0";
    }
  };

  // Filter posts based on active tab
  const filteredPosts = useMemo(() => {
    const allPosts = posts.length > 0 ? posts : reduxPosts;
    switch (activeTab) {
      case "All Posts":
        return allPosts;

      case "Following":
        if (followingPosts.length > 0) {
          return followingPosts;
        }

        if (reduxFollowingPosts.length > 0) {
          return reduxFollowingPosts;
        }

        // Fallback: filter from all posts
        return allPosts.filter(
          (post) =>
            post.isFromFollowing ||
            (post.author &&
              typeof post.author === "object" &&
              post.author.isFollowed)
        );

      case "My Posts":
        if (myPosts.length > 0) {
          return myPosts;
        }

        const userId = user?._id || user?.id;
        if (!userId) return [];

        return allPosts.filter((post) => {
          return (
            post.author === userId ||
            post.author?.toString() === userId ||
            (typeof post.author === "object" && post.author._id === userId) ||
            post.userId === userId ||
            post.createdBy === userId
          );
        });

      default:
        return allPosts;
    }
  }, [
    activeTab,
    posts,
    followingPosts,
    myPosts,
    user,
    reduxPosts,
    reduxFollowingPosts,
  ]);

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
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
        try {
          const rect = activeEl.getBoundingClientRect();
          const parentRect = activeEl.parentElement.getBoundingClientRect();

          underline.style.width = `${rect.width}px`;
          underline.style.transform = `translateX(${
            rect.left - parentRect.left
          }px)`;
        } catch (error) {
          console.error("Error updating underline:", error);
        }
      }
    };

    const timeoutId = setTimeout(updateUnderline, 10);

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
              ref={(el) => {
                if (el) {
                  tabRefs.current[tab] = el;
                }
              }}
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

      {/* Tab Content */}
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
