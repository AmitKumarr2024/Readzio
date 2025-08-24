import React, { useState, useRef, useEffect, useMemo } from "react";

// Mock Redux selector for demo
const mockSocketState = {
  postCounts: {
    allPostsCount: 1234,
    followingPostsCount: 56,
    myPostsCount: 12,
  },
};

// Mock PostTabContent for demo
const PostTabContent = ({ activeTab, posts, user, loading }) => {
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Loading posts...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
          Tab Content Debug Info:
        </h3>
        <p className="text-sm text-blue-600 dark:text-blue-300">
          Active Tab: <strong>{activeTab}</strong>
        </p>
        <p className="text-sm text-blue-600 dark:text-blue-300">
          Posts Count: <strong>{posts.length}</strong>
        </p>
        <p className="text-sm text-blue-600 dark:text-blue-300">
          User:{" "}
          <strong>
            {user
              ? `${user.name || user.email || user.id || "User logged in"}`
              : "Not logged in"}
          </strong>
        </p>
        <p className="text-sm text-blue-600 dark:text-blue-300">
          Loading: <strong>{loading ? "Yes" : "No"}</strong>
        </p>
      </div>

      <h3 className="text-lg font-semibold mb-4">
        Posts in "{activeTab}" tab:
      </h3>

      {posts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg mb-2">No posts found for "{activeTab}"</p>
          {activeTab === "My Posts" && (
            <p className="text-sm">This could mean:</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.slice(0, 3).map((post, index) => (
            <div
              key={post.id || post._id || index}
              className="p-4 border rounded-lg bg-white dark:bg-gray-800"
            >
              <h4 className="font-medium mb-2">
                {post.title || `Post ${index + 1}`}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Author: {post.author || post.userId || "Unknown"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {post.content?.substring(0, 100) ||
                  post.description?.substring(0, 100) ||
                  "No content preview"}
              </p>
            </div>
          ))}
          {posts.length > 3 && (
            <p className="text-sm text-gray-500">
              ... and {posts.length - 3} more posts
            </p>
          )}
        </div>
      )}
    </div>
  );
};

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
  loading = false,
  followingPosts = [],
  myPosts = [],
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState("All Posts");

  // Mock useSelector for demo
  const { postCounts } = mockSocketState;
  const isAuthenticated = !!user;

  console.log("🔍 TabbedPostSection Debug:", {
    user,
    postsCount: posts.length,
    isAuthenticated,
    activeTab,
    postCounts,
  });

  const tabs = isAuthenticated
    ? ["All Posts", "Following", "My Posts"]
    : ["All Posts"];

  const getTabCount = (tab) => {
    const count = (() => {
      switch (tab) {
        case "All Posts":
          return postCounts?.allPostsCount || posts.length || 0;
        case "Following":
          return postCounts?.followingPostsCount || followingPosts.length || 0;
        case "My Posts":
          return postCounts?.myPostsCount || myPosts.length || 0;
        default:
          return 0;
      }
    })();

    console.log(`Tab "${tab}" count:`, count);
    return formatNumber(count);
  };

  // Filter posts based on active tab
  const filteredPosts = useMemo(() => {
    console.log("🎯 Filtering posts for tab:", activeTab);
    console.log("📊 Available data:", {
      allPosts: posts.length,
      followingPosts: followingPosts.length,
      myPosts: myPosts.length,
      userId: user?.id || user?._id,
      samplePost: posts[0],
    });

    switch (activeTab) {
      case "All Posts":
        console.log("✅ Returning all posts:", posts.length);
        return posts;

      case "Following":
        if (followingPosts.length > 0) {
          console.log(
            "✅ Using provided followingPosts:",
            followingPosts.length
          );
          return followingPosts;
        }

        const followingFiltered = posts.filter(
          (post) => post.isFromFollowing || post.author?.isFollowed
        );
        console.log(
          "✅ Filtered following posts from all posts:",
          followingFiltered.length
        );
        return followingFiltered;

      case "My Posts":
        if (myPosts.length > 0) {
          console.log("✅ Using provided myPosts:", myPosts.length);
          return myPosts;
        }

        const userId = user?.id || user?._id;
        if (!userId) {
          console.log("❌ No user ID found, returning empty array");
          return [];
        }

        const userPosts = posts.filter((post) => {
          const isMyPost =
            post.author === userId ||
            post.author?.toString() === userId ||
            post.author?.id === userId ||
            post.author?._id === userId ||
            post.userId === userId ||
            post.createdBy === userId;

          if (isMyPost) {
            console.log("✅ Found user post:", {
              title: post.title,
              postAuthor: post.author,
              userId: userId,
              match: true,
            });
          }

          return isMyPost;
        });

        console.log("✅ Filtered user posts:", userPosts.length);
        return userPosts;

      default:
        return posts;
    }
  }, [activeTab, posts, followingPosts, myPosts, user?.id, user?._id]);

  // Handle tab change
  const handleTabChange = (tab) => {
    console.log("🔄 Tab changing from", activeTab, "to", tab);
    setActiveTab(tab);

    if (onTabChange) {
      console.log("📢 Calling onTabChange callback with:", tab);
      onTabChange(tab);
    }
  };

  // Refs for dynamic underline
  const tabRefs = useRef({});
  const underlineRef = useRef();

  useEffect(() => {
    console.log("📏 Updating underline for tab:", activeTab);

    const updateUnderline = () => {
      const activeEl = tabRefs.current[activeTab];
      const underline = underlineRef.current;

      if (activeEl && underline) {
        const rect = activeEl.getBoundingClientRect();
        const parentRect = activeEl.parentElement.getBoundingClientRect();

        const width = rect.width;
        const left = rect.left - parentRect.left;

        underline.style.width = `${width}px`;
        underline.style.transform = `translateX(${left}px)`;

        console.log("📏 Underline updated:", { width, left });
      } else {
        console.log("❌ Could not update underline - missing elements");
      }
    };

    const timeoutId = setTimeout(updateUnderline, 10);

    const handleResize = () => {
      console.log("📱 Window resized, updating underline");
      updateUnderline();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [activeTab, tabs]);

  // Demo data if no props provided
  const demoUser = { id: "688b8843e0d57e5fe48dc49c", name: "Demo User" };
  const demoPosts = [
    {
      id: "1",
      title: "Sample Post 1",
      author: "688b8843e0d57e5fe48dc49c",
      content: "This is a sample post for All Posts tab",
    },
    {
      id: "2",
      title: "Sample Post 2",
      author: "different-user-id",
      content: "Another sample post by different user",
    },
    {
      id: "3",
      title: "My Post",
      author: "688b8843e0d57e5fe48dc49c",
      content: "This should show in My Posts tab",
    },
  ];

  const effectiveUser = user || demoUser;
  const effectivePosts = posts.length > 0 ? posts : demoPosts;

  return (
    <div className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
      {/* Debug Panel */}
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 mb-4">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          🐛 Debug Information:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p>
              <strong>Active Tab:</strong> {activeTab}
            </p>
            <p>
              <strong>Available Tabs:</strong> {tabs.join(", ")}
            </p>
            <p>
              <strong>User:</strong> {effectiveUser ? "Logged in" : "Guest"}
            </p>
          </div>
          <div>
            <p>
              <strong>All Posts:</strong> {effectivePosts.length}
            </p>
            <p>
              <strong>Following Posts:</strong> {followingPosts.length}
            </p>
            <p>
              <strong>My Posts:</strong> {myPosts.length}
            </p>
          </div>
          <div>
            <p>
              <strong>Filtered Posts:</strong> {filteredPosts.length}
            </p>
            <p>
              <strong>Loading:</strong> {loading ? "Yes" : "No"}
            </p>
            <p>
              <strong>User ID:</strong>{" "}
              {effectiveUser?.id || effectiveUser?._id || "None"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative h-16 flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto px-4 sm:px-6 md:px-8 mb-4 border-b border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          const count = getTabCount(tab);

          return (
            <button
              key={tab}
              ref={(el) => {
                if (el) tabRefs.current[tab] = el;
              }}
              onClick={() => handleTabChange(tab)}
              className={`relative whitespace-nowrap py-2.5 px-5 font-semibold text-sm sm:text-base transition-all rounded-md ${
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              }`}
            >
              {tab}
              {count !== "0" && (
                <span className="absolute top-1 -right-3 min-w-[20px] px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full shadow ring-1 ring-gray-200 dark:ring-gray-600">
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Dynamic underline */}
        <span
          ref={underlineRef}
          className="absolute bottom-0 left-0 h-1 bg-blue-600 dark:bg-blue-400 transition-all duration-300 ease-in-out"
          style={{ width: 0 }}
        />
      </div>

      {/* Tab Content */}
      <PostTabContent
        activeTab={activeTab}
        posts={filteredPosts}
        user={effectiveUser}
        loading={loading}
      />
    </div>
  );
};

export default TabbedPostSection;
