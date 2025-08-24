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
  const { postCounts } = useSelector(selectSocketState);
  const isAuthenticated = !!user;

  // console.log("🔍 TabbedPostSection Props:", {
  //   userExists: !!user,
  //   userId: user?._id || user?.id,
  //   postsCount: posts.length,
  //   activeTab,
  //   samplePost: posts[0],
  // });

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
    // console.log("🎯 Filtering posts for tab:", activeTab);
    // console.log("📊 Filter data:", {
    //   totalPosts: posts.length,
    //   userId: user?._id || user?.id,
    //   sampleAuthor: posts[0]?.author,
    // });

    switch (activeTab) {
      case "All Posts":
        // console.log("✅ All Posts tab - returning", posts.length, "posts");
        return posts;

      case "Following":
        if (followingPosts.length > 0) {
          // console.log(
          //   "✅ Using provided followingPosts:",
          //   followingPosts.length
          // );
          return followingPosts;
        }

        const followingFiltered = posts.filter(
          (post) =>
            post.isFromFollowing ||
            (post.author &&
              typeof post.author === "object" &&
              post.author.isFollowed)
        );
        // console.log("✅ Filtered following posts:", followingFiltered.length);
        return followingFiltered;

      case "My Posts":
        if (myPosts.length > 0) {
          // console.log("✅ Using provided myPosts:", myPosts.length);
          return myPosts;
        }

        // Get user ID - could be _id or id
        const userId = user?._id || user?.id;

        if (!userId) {
          // console.log("❌ No user ID found");
          return [];
        }

        const userPosts = posts.filter((post) => {
          // post.author is ObjectId string like "688b8843e0d57e5fe48dc49c"
          const isMyPost =
            post.author === userId || // Direct string match
            post.author?.toString() === userId || // Convert to string
            (typeof post.author === "object" && post.author._id === userId) || // If populated
            post.userId === userId || // Alternative field
            post.createdBy === userId; // Alternative field

          // if (isMyPost) {
          //   console.log("✅ Found my post:", {
          //     title: post.title,
          //     postAuthor: post.author,
          //     userId: userId,
          //   });
          // }

          return isMyPost;
        });

        // console.log("✅ My posts filtered result:", userPosts.length);
        return userPosts;

      default:
        return posts;
    }
  }, [activeTab, posts, followingPosts, myPosts, user?._id, user?.id]);

  // Handle tab change
  const handleTabChange = (tab) => {
    // console.log("🔄 Changing tab to:", tab);
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
