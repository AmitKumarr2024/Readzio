import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { debounce } from "lodash";
import CardOfPost from "../Cards/CardOfPost";
import {
  getAllPosts,
  fetchFollowingPosts,
  clearCurrentPost, // Import the clear action
} from "../../store/postSlice";
import { fetchCommentsAndCount } from "../../store/commentSlice";
import { fetchCategories } from "../../store/categorySlice";
import { fetchFollowers } from "../../store/followSlice";
import {
  selectSocketState,
  fetchInitialPostCounts,
} from "../../store/socketSlice";
import { fetchPublicPosts } from "../../store/guestSlice";
import Sorted from "../Tabs/Sorted";
import ErrorBoundary from "./ErrorBoundary";
import Skeleton from "@/components/Ui/Skeleton";
import MultiplexAd from "../../Ads/MultiplexAd";
import SafeInFeedAd from "../../Ads/SafeInFeedAd";
import useWindowWidth from "../../Utils/useWindowWidth";

const Postbox = ({ filterType, category, customPosts = [], user }) => {
  const dispatch = useDispatch();
  const {
    posts = [],
    loading: postLoading = false,
    error: postError,
    followingPosts = [], // Add this
    publicPosts: reduxPublicPosts = [], // Add this for authenticated users
  } = useSelector((state) => state.post || {});

  const { publicPosts = [], publicLoading = false } = useSelector(
    (state) => state.guest || {}
  );

  const { commentCounts = {}, loading: commentLoading } = useSelector(
    (state) => state.comment || {}
  );
  const { categories = [] } = useSelector((state) => state.categories || {});
  const isSidebarOpen = useSelector(
    (state) => state.postMeta?.isSidebarOpen ?? false
  );
  const currentUser = useSelector((state) => state.auth?.user ?? { _id: null });
  const isAuthenticated = !!currentUser._id;
  const { followers = { list: [] } } = useSelector(
    (state) => state.follow || {}
  );
  const { socket, postCounts } = useSelector(selectSocketState);

  const postsPerPage = 100;
  const [currentPage, setCurrentPage] = useState(1);
  const [hasInitialized, setHasInitialized] = useState(false); // Track initialization
  const observer = useRef(null);
  const lastPostElementRef = useRef(null);

  // Clear any stuck post state on component mount
  useEffect(() => {
    dispatch(clearCurrentPost());
  }, [dispatch]);

  // Debounced fetch for comments
  const debouncedFetchComments = useMemo(
    () =>
      debounce((postIds) => {
        postIds.forEach((postId) => {
          dispatch(fetchCommentsAndCount(postId));
        });
      }, 1000),
    [dispatch]
  );

  const cardsPerRow = useMemo(() => {
    if (isSidebarOpen) {
      return window.innerWidth >= 1280
        ? 4
        : window.innerWidth >= 1024
        ? 3
        : window.innerWidth >= 768
        ? 3
        : window.innerWidth >= 640
        ? 2
        : 1;
    }
    return window.innerWidth >= 1280
      ? 5
      : window.innerWidth >= 1024
      ? 3
      : window.innerWidth >= 768
      ? 3
      : window.innerWidth >= 640
      ? 2
      : 1;
  }, [isSidebarOpen]);

  // Initialize categories and followers
  useEffect(() => {
    dispatch(fetchCategories());
    if (isAuthenticated) dispatch(fetchFollowers());
    dispatch(fetchInitialPostCounts());
  }, [dispatch, isAuthenticated]);

  // FIXED: Simplified initial posts loading without fetchPostsSequentially
  useEffect(() => {
    if (customPosts.length || hasInitialized) return;

    const options = { page: 1, limit: postsPerPage };
    const loadInitialPosts = async () => {
      try {
        console.log("🔄 Loading initial posts for filterType:", filterType);

        if (isAuthenticated) {
          if (filterType === "Following") {
            await dispatch(fetchFollowingPosts(options)).unwrap();
          } else if (filterType === "Followers" && followers.list.length) {
            await dispatch(
              getAllPosts({
                authorIds: followers.list.map((u) => u._id),
                ...options,
              })
            ).unwrap();
          } else if (filterType === "My Posts" && user?._id) {
            await dispatch(
              getAllPosts({ userId: user._id, ...options })
            ).unwrap();
          } else {
            await dispatch(getAllPosts(options)).unwrap();
          }
        } else {
          await dispatch(fetchPublicPosts(options)).unwrap();
        }

        setHasInitialized(true);
        console.log("✅ Initial posts loaded successfully");
      } catch (e) {
        console.error("❌ Failed to load initial posts:", e);
        setHasInitialized(true); // Set as initialized even on error to prevent retry loop
      }
    };

    loadInitialPosts();
  }, [
    dispatch,
    filterType,
    user?._id,
    customPosts.length,
    followers.list,
    isAuthenticated,
    hasInitialized, // Add this dependency
  ]);

  // FIXED: Simplified socket handling without fetchPostsSequentially
  useEffect(() => {
    if (!socket || customPosts.length) return;

    const handlePostCreated = debounce((newPost) => {
      console.log("🔔 New post created, reloading...");
      const options = { page: 1, limit: postsPerPage };
      const reloadPosts = async () => {
        try {
          if (isAuthenticated) {
            if (filterType === "Following") {
              await dispatch(fetchFollowingPosts(options)).unwrap();
            } else if (filterType === "My Posts" && user?._id) {
              await dispatch(
                getAllPosts({ userId: user._id, ...options })
              ).unwrap();
            } else {
              await dispatch(getAllPosts(options)).unwrap();
            }
          } else {
            await dispatch(fetchPublicPosts(options)).unwrap();
          }
        } catch (e) {
          console.error("❌ Failed to reload posts:", e);
        }
      };
      reloadPosts();

      // Update counts
      if (isAuthenticated) {
        dispatch({
          type: "socket/setPostCounts",
          payload: {
            allPostsCount: postCounts.allPostsCount + 1,
            myPostsCount:
              newPost.authorId === user?._id
                ? postCounts.myPostsCount + 1
                : postCounts.myPostsCount,
            followingPostsCount: followers.list
              .map((u) => u._id)
              .includes(newPost.authorId)
              ? postCounts.followingPostsCount + 1
              : postCounts.followingPostsCount,
          },
        });
      }
    }, 300);

    const handlePostUpdated = debounce(() => {
      console.log("🔔 Post updated, reloading...");
      const options = { page: 1, limit: postsPerPage };
      const reloadPosts = async () => {
        try {
          if (isAuthenticated) {
            if (filterType === "Following") {
              await dispatch(fetchFollowingPosts(options)).unwrap();
            } else if (filterType === "My Posts" && user?._id) {
              await dispatch(
                getAllPosts({ userId: user._id, ...options })
              ).unwrap();
            } else {
              await dispatch(getAllPosts(options)).unwrap();
            }
          } else {
            await dispatch(fetchPublicPosts(options)).unwrap();
          }
        } catch (e) {
          console.error("❌ Failed to reload posts:", e);
        }
      };
      reloadPosts();
    }, 300);

    const handlePostDeleted = debounce((data) => {
      console.log("🔔 Post deleted, reloading...");
      const options = { page: 1, limit: postsPerPage };
      const reloadPosts = async () => {
        try {
          if (isAuthenticated) {
            if (filterType === "Following") {
              await dispatch(fetchFollowingPosts(options)).unwrap();
            } else if (filterType === "My Posts" && user?._id) {
              await dispatch(
                getAllPosts({ userId: user._id, ...options })
              ).unwrap();
            } else {
              await dispatch(getAllPosts(options)).unwrap();
            }
          } else {
            await dispatch(fetchPublicPosts(options)).unwrap();
          }
        } catch (e) {
          console.error("❌ Failed to reload posts:", e);
        }
      };
      reloadPosts();

      // Update counts
      if (isAuthenticated) {
        dispatch({
          type: "socket/setPostCounts",
          payload: {
            allPostsCount: Math.max(0, postCounts.allPostsCount - 1),
            myPostsCount:
              data.authorId === user?._id
                ? Math.max(0, postCounts.myPostsCount - 1)
                : postCounts.myPostsCount,
            followingPostsCount: followers.list
              .map((u) => u._id)
              .includes(data.authorId)
              ? Math.max(0, postCounts.followingPostsCount - 1)
              : postCounts.followingPostsCount,
          },
        });
      }
    }, 300);

    socket.on("postCreated", handlePostCreated);
    socket.on("postUpdated", handlePostUpdated);
    socket.on("postDeleted", handlePostDeleted);

    return () => {
      socket.off("postCreated", handlePostCreated);
      socket.off("postUpdated", handlePostUpdated);
      socket.off("postDeleted", handlePostDeleted);
    };
  }, [
    socket,
    dispatch,
    customPosts.length,
    postsPerPage,
    filterType,
    user?._id,
    postCounts,
    followers.list,
    isAuthenticated,
  ]);

  const categoryMap = useMemo(() => {
    return categories.reduce((map, cat) => {
      if (cat?._id && cat?.name) map[cat._id] = cat.name;
      return map;
    }, {});
  }, [categories]);

  // FIXED: Get the correct posts based on filter type
  const getSourcePosts = useMemo(() => {
    if (customPosts.length) return customPosts;

    if (isAuthenticated) {
      switch (filterType) {
        case "Following":
          return followingPosts;
        case "My Posts":
          return posts.filter((post) => post.author?._id === user?._id);
        case "Followers":
          const followersIds = followers.list.map((u) => u._id);
          return posts.filter(
            (post) =>
              followersIds.includes(String(post.author?._id)) &&
              String(post.author?._id) !== String(currentUser._id)
          );
        default:
          return posts;
      }
    }

    return publicPosts;
  }, [
    customPosts,
    posts,
    followingPosts,
    publicPosts,
    filterType,
    user?._id,
    followers.list,
    currentUser._id,
    isAuthenticated,
  ]);

  const filteredPosts = useMemo(() => {
    console.log("📊 Source posts count:", getSourcePosts.length);
    console.log("📊 Filter type:", filterType);
    console.log("📊 Category filter:", category);

    let validPosts = getSourcePosts.filter(
      (post) =>
        post?._id &&
        post?.isPublished !== false && // Allow undefined or true
        !post?.blocked &&
        post?.author &&
        post?.category
    );

    console.log("📊 Valid posts after basic filtering:", validPosts.length);

    if (category) {
      validPosts = validPosts.filter((post) => {
        let postCategorySlug = "";
        if (typeof post.category === "object" && post.category?.slug) {
          postCategorySlug = post.category.slug.toLowerCase();
        } else if (typeof post.category === "string") {
          const matched = categories.find((cat) => cat._id === post.category);
          if (matched) postCategorySlug = matched.slug?.toLowerCase();
        }
        return postCategorySlug === category.toLowerCase();
      });
      console.log(
        "📊 Valid posts after category filtering:",
        validPosts.length
      );
    }

    return validPosts;
  }, [
    getSourcePosts,
    filterType,
    user?._id,
    followers.list,
    category,
    currentUser._id,
    isAuthenticated,
    categories,
  ]);

  const sortedPosts = useMemo(() => {
    const seen = new Set();
    const uniquePosts = filteredPosts.filter((post) => {
      if (post?._id && !seen.has(post._id)) {
        seen.add(post._id);
        return true;
      }
      return false;
    });

    console.log("📊 Final sorted posts count:", uniquePosts.length);
    return uniquePosts;
  }, [filteredPosts]);

  const hasMore = useMemo(
    () => sortedPosts.length >= currentPage * postsPerPage,
    [sortedPosts.length, currentPage]
  );

  const selectedPosts = useMemo(() => {
    return sortedPosts.map((post) => ({
      ...post,
      category: {
        _id:
          typeof post.category === "string"
            ? post.category
            : post.category?._id || "",
      },
      categoryName:
        categoryMap[
          typeof post?.category === "string"
            ? post.category
            : post.category?._id
        ] || "Uncategorized",
      likesCount: post?.likes?.length ?? 0,
      viewsCount: post?.viewsCount ?? 0,
      bookmarksCount: post?.bookmarksCount ?? 0,
      shareCount: post?.shareCount ?? 0,
      isSubscriberOnly: post?.isSubscriberOnly ?? false,
      postType: post?.postType || "Article",
      isPremium: post?.isPremium ?? false,
      tags: post?.tags || [],
      readTime: post?.readTime,
    }));
  }, [sortedPosts, categoryMap]);

  // Updated useEffect for fetching comments
  useEffect(() => {
    const postsToFetch = getSourcePosts
      .filter((post) => post?._id && commentCounts[post._id] === undefined)
      .map((post) => post._id)
      .slice(0, 10); // Batch to 10 posts to reduce load
    if (postsToFetch.length && !commentLoading) {
      debouncedFetchComments(postsToFetch);
    }
    return () => debouncedFetchComments.cancel();
  }, [getSourcePosts, commentCounts, commentLoading, debouncedFetchComments]);

  const screenWidth = useWindowWidth();

  const insertAdsIntoPosts = (posts) => {
    const result = [...posts];
    const items = [];
    let adFrequency = 9;
    if (screenWidth < 1024 && screenWidth >= 768) adFrequency = 8;

    for (let i = 0; i < result.length; i++) {
      items.push(result[i]);
      if ((i + 1) % 6 === 0) {
        items.push({
          type: "card-ad",
          id: `card-ad-${i}`,
          postId: result[i]._id,
        });
      }
      if ((i + 1) % adFrequency === 0) {
        items.push({
          type: "multiplex-ad",
          id: `multiplex-ad-${i}`,
          postId: result[i]._id,
        });
      }
    }
    return items;
  };

  const itemsWithAds = useMemo(
    () => insertAdsIntoPosts(selectedPosts),
    [selectedPosts, screenWidth]
  );

  // FIXED: Simplified load more without fetchPostsSequentially
  const loadMorePosts = useCallback(async () => {
    if (!(postLoading || publicLoading) && hasMore && hasInitialized) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      const options = {
        page: nextPage,
        limit: postsPerPage,
      };
      try {
        console.log("🔄 Loading more posts, page:", nextPage);

        if (isAuthenticated) {
          if (filterType === "Following") {
            await dispatch(fetchFollowingPosts(options)).unwrap();
          } else if (filterType === "Followers" && followers.list.length) {
            await dispatch(
              getAllPosts({
                authorIds: followers.list.map((user) => user._id),
                ...options,
              })
            ).unwrap();
          } else if (filterType === "My Posts" && user?._id) {
            await dispatch(
              getAllPosts({ userId: user._id, ...options })
            ).unwrap();
          } else {
            await dispatch(getAllPosts(options)).unwrap();
          }
        } else {
          await dispatch(fetchPublicPosts(options)).unwrap();
        }

        console.log("✅ More posts loaded successfully");
      } catch (e) {
        console.error("❌ Failed to load more posts:", e);
      }
    }
  }, [
    dispatch,
    currentPage,
    postLoading,
    publicLoading,
    hasMore,
    hasInitialized,
    filterType,
    followers.list,
    user?._id,
    isAuthenticated,
  ]);

  useEffect(() => {
    if (!lastPostElementRef.current || !hasMore || !hasInitialized) return;
    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !(postLoading || publicLoading))
          loadMorePosts();
      },
      { threshold: 0.1 }
    );
    observer.current.observe(lastPostElementRef.current);
    return () => {
      if (observer.current && lastPostElementRef.current)
        observer.current.unobserve(lastPostElementRef.current);
    };
  }, [loadMorePosts, hasMore, postLoading, publicLoading, hasInitialized]);

  const renderSkeletonGrid = () => (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${
        isSidebarOpen
          ? "lg:grid-cols-3 xl:grid-cols-4"
          : "lg:grid-cols-3 xl:grid-cols-5"
      } gap-4 py-6 w-full`}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-64 w-full rounded-lg bg-gray-200 dark:bg-gray-700"
        />
      ))}
    </div>
  );

  // Debug logging
  useEffect(() => {
    console.log("🐛 Debug Info:", {
      hasInitialized,
      postLoading,
      publicLoading,
      postsCount: getSourcePosts.length,
      filteredPostsCount: filteredPosts.length,
      selectedPostsCount: selectedPosts.length,
      filterType,
      isAuthenticated,
      customPostsLength: customPosts.length,
    });
  }, [
    hasInitialized,
    postLoading,
    publicLoading,
    getSourcePosts.length,
    filteredPosts.length,
    selectedPosts.length,
    filterType,
    isAuthenticated,
    customPosts.length,
  ]);

  return (
    <ErrorBoundary>
      <div className="w-full px-4 py-4">
        <Sorted posts={filteredPosts} onSortChange={() => {}} />

        {/* Show loading only if not initialized or no posts yet */}
        {(postLoading || publicLoading) && !hasInitialized ? (
          renderSkeletonGrid()
        ) : postError ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">
              {postError?.message || "Error loading posts"}
            </p>
            <button
              onClick={() => {
                setHasInitialized(false);
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div
              className={`grid gap-4 py-6 w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${
                isSidebarOpen
                  ? "lg:grid-cols-3 xl:grid-cols-4"
                  : "lg:grid-cols-3 xl:grid-cols-5"
              }`}
            >
              {itemsWithAds.length ? (
                itemsWithAds.map((item, i) => {
                  if (item.type === "card-ad") {
                    return (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden w-full min-w-[250px]"
                      >
                        <SafeInFeedAd postId={item.postId} />
                      </div>
                    );
                  }
                  if (item.type === "multiplex-ad") {
                    return (
                      <div
                        key={item.id}
                        className="col-span-full w-full border-t border-b border-gray-300 dark:border-gray-600 my-4"
                      >
                        <MultiplexAd postId={item.postId} testMode={false} />
                      </div>
                    );
                  }
                  return (
                    <div
                      key={item._id}
                      ref={
                        i === itemsWithAds.length - 1
                          ? lastPostElementRef
                          : null
                      }
                      className="w-full"
                    >
                      <CardOfPost
                        {...item}
                        commentsCount={commentCounts[item._id] ?? 0}
                        loading={false} // Don't show loading on individual cards
                        categoryMap={categoryMap}
                        postType={item?.postType}
                        isPremium={item?.isPremium}
                        readTime={item?.readTime}
                      />
                    </div>
                  );
                })
              ) : hasInitialized ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500 text-lg mb-4">
                    {filterType === "Following"
                      ? "Follow users to see their posts here."
                      : filterType === "Followers"
                      ? "No posts from your followers yet."
                      : filterType === "My Posts"
                      ? "You haven't posted yet."
                      : "No posts found"}
                  </p>
                  {(filterType === "Following" ||
                    filterType === "Followers") && (
                    <button
                      onClick={() => {
                        setHasInitialized(false);
                        setCurrentPage(1);
                      }}
                      className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Refresh
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            {/* Loading more indicator */}
            {(postLoading || publicLoading) &&
              hasInitialized &&
              selectedPosts.length > 0 && (
                <div className="flex justify-center py-4">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Postbox;
