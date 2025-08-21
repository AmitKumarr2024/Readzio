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
  getSinglePost,
} from "../../store/postSlice";
import { fetchCommentCount } from "../../store/commentSlice";
import { fetchCategories } from "../../store/categorySlice";
import { fetchFollowers } from "../../store/followSlice";
import { fetchInitialPostCounts } from "../../store/socketSlice";
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
  } = useSelector((state) => state.post || {});
  const { publicPosts = [], publicLoading = false } = useSelector(
    (state) => state.guest || {}
  );
  const { commentCounts = {} } = useSelector((state) => state.comment || {});
  const { categories = [] } = useSelector((state) => state.categories || {});
  const isSidebarOpen = useSelector(
    (state) => state.postMeta?.isSidebarOpen ?? false
  );
  const currentUser = useSelector((state) => state.auth?.user ?? { _id: null });
  const isAuthenticated = !!currentUser._id;
  const { followers = { list: [] } } = useSelector(
    (state) => state.follow || {}
  );
  const { socket, postCounts } = useSelector((state) => state.socket || {});

  const postsPerPage = 12;
  const [currentPage, setCurrentPage] = useState(1);
  const [retryCount, setRetryCount] = useState(0);
  const observer = useRef(null);
  const lastPostElementRef = useRef(null);

  const cardsPerRow = useMemo(() => {
    return isSidebarOpen
      ? window.innerWidth >= 1280
        ? 4
        : window.innerWidth >= 1024
        ? 3
        : window.innerWidth >= 768
        ? 3
        : window.innerWidth >= 640
        ? 2
        : 1
      : window.innerWidth >= 1280
      ? 5
      : window.innerWidth >= 1024
      ? 3
      : window.innerWidth >= 768
      ? 3
      : window.innerWidth >= 640
      ? 2
      : 1;
  }, [isSidebarOpen]);

  // Fetch initial data
  useEffect(() => {
    dispatch(fetchCategories());
    if (isAuthenticated) dispatch(fetchFollowers());
    dispatch(fetchInitialPostCounts());
  }, [dispatch, isAuthenticated]);

  // Load initial posts
  useEffect(() => {
    if (customPosts.length) return;
    const options = { page: 1, limit: postsPerPage, blocked: { $ne: true } };
    const loadInitialPosts = async () => {
      try {
        let metaPosts;
        if (isAuthenticated) {
          if (filterType === "Following") {
            metaPosts = await dispatch(fetchFollowingPosts(options)).unwrap();
          } else if (filterType === "Followers" && followers.list.length) {
            metaPosts = await dispatch(
              getAllPosts({
                authorIds: followers.list.map((u) => u._id),
                ...options,
              })
            ).unwrap();
          } else if (filterType === "My Posts" && user?._id) {
            metaPosts = await dispatch(
              getAllPosts({ userId: user._id, ...options })
            ).unwrap();
          } else {
            metaPosts = await dispatch(getAllPosts(options)).unwrap();
          }
          await fetchPostsSequentially({
            dispatch,
            posts: metaPosts.posts.map((p) => ({ slug: p.slug })),
            getThunk: ({ slug }) => getSinglePost({ slug }),
          });
        } else {
          metaPosts = await dispatch(fetchPublicPosts(options)).unwrap();
        }
        setRetryCount(0); // Reset retry count on success
      } catch (e) {
        console.error("❌ Failed to load initial posts:", e);
        if (retryCount < 3) {
          setTimeout(() => setRetryCount(retryCount + 1), 2000); // Retry after 2s
        }
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
    retryCount,
  ]);

  // Debounced load more posts
  const loadMorePosts = useCallback(
    debounce(async () => {
      if (postLoading || publicLoading || !hasMore) return;
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      const options = {
        page: nextPage,
        limit: postsPerPage,
        blocked: { $ne: true },
      };
      try {
        let metaPosts;
        if (isAuthenticated) {
          if (filterType === "Following") {
            metaPosts = await dispatch(fetchFollowingPosts(options)).unwrap();
          } else if (filterType === "Followers" && followers.list.length) {
            metaPosts = await dispatch(
              getAllPosts({
                authorIds: followers.list.map((user) => user._id),
                ...options,
              })
            ).unwrap();
          } else if (filterType === "My Posts" && user?._id) {
            metaPosts = await dispatch(
              getAllPosts({ userId: user._id, ...options })
            ).unwrap();
          } else {
            metaPosts = await dispatch(getAllPosts(options)).unwrap();
          }
          await fetchPostsSequentially({
            dispatch,
            posts: metaPosts.posts.map((p) => ({ slug: p.slug })),
            getThunk: ({ slug }) => getSinglePost({ slug }),
          });
        } else {
          metaPosts = await dispatch(fetchPublicPosts(options)).unwrap();
        }
        setRetryCount(0);
      } catch (e) {
        console.error("❌ Failed to load more posts:", e);
        if (retryCount < 3) {
          setTimeout(() => setRetryCount(retryCount + 1), 2000);
        }
      }
    }, 300),
    [
      dispatch,
      currentPage,
      postLoading,
      publicLoading,
      hasMore,
      filterType,
      followers.list,
      user?._id,
      isAuthenticated,
      retryCount,
    ]
  );

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!lastPostElementRef.current || !hasMore) return;
    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !(postLoading || publicLoading)) {
          loadMorePosts();
        }
      },
      { threshold: 0.5, rootMargin: "200px" } // Load earlier
    );
    observer.current.observe(lastPostElementRef.current);
    return () => {
      if (observer.current && lastPostElementRef.current)
        observer.current.unobserve(lastPostElementRef.current);
    };
  }, [loadMorePosts, hasMore, postLoading, publicLoading]);

  const categoryMap = useMemo(() => {
    return categories.reduce((map, cat) => {
      if (cat?._id && cat?.name) map[cat._id] = cat.name;
      return map;
    }, {});
  }, [categories]);

  const filteredPosts = useMemo(() => {
    const sourcePosts = customPosts.length
      ? customPosts
      : isAuthenticated
      ? posts
      : publicPosts;
    let validPosts = sourcePosts.filter(
      (post) =>
        post?._id &&
        post?.isPublished &&
        !post?.blocked &&
        post?.author &&
        post?.category
    );
    if (category) {
      validPosts = validPosts.filter((post) => {
        let postCategorySlug =
          typeof post.category === "object" && post.category?.slug
            ? post.category.slug.toLowerCase()
            : categories
                .find((cat) => cat._id === post.category)
                ?.slug?.toLowerCase() || "";
        return postCategorySlug === category.toLowerCase();
      });
    }
    if (isAuthenticated && filterType === "My Posts") {
      validPosts = validPosts.filter((post) => post.author?._id === user?._id);
    }
    if (isAuthenticated && filterType === "Followers") {
      const followersIds = followers.list.map((user) => user._id);
      validPosts = validPosts.filter(
        (post) =>
          followersIds.includes(String(post.author?._id)) &&
          String(post.author?._id) !== String(currentUser._id)
      );
    }
    if (isAuthenticated && filterType === "Following") {
      validPosts = validPosts.filter(
        (post) => String(post.author?._id) !== String(currentUser._id)
      );
    }
    return validPosts;
  }, [
    customPosts,
    posts,
    publicPosts,
    filterType,
    user?._id,
    followers.list,
    category,
    currentUser._id,
    isAuthenticated,
  ]);

  const sortedPosts = useMemo(() => {
    const seen = new Set();
    return filteredPosts.filter((post) => {
      if (post?._id && !seen.has(post._id)) {
        seen.add(post._id);
        return true;
      }
      return false;
    });
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
          typeof post.category === "string" ? post.category : post.category?._id
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

  const screenWidth = useWindowWidth();

  const insertAdsIntoPosts = useMemo(() => {
    const result = [...selectedPosts];
    const items = [];
    let adFrequency = screenWidth < 1024 && screenWidth >= 768 ? 8 : 9;
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
  }, [selectedPosts, screenWidth]);

  const renderSkeletonGrid = () => (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${
        isSidebarOpen
          ? "lg:grid-cols-3 xl:grid-cols-4"
          : "lg:grid-cols-3 xl:grid-cols-5"
      } gap-4 py-6 w-full`}
    >
      {Array.from({ length: postsPerPage }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-64 w-full rounded-lg bg-gray-200 dark:bg-gray-700"
        />
      ))}
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="w-full px-4 py-4">
        <Sorted posts={filteredPosts} onSortChange={() => {}} />
        {(postLoading || publicLoading) && !selectedPosts.length ? (
          renderSkeletonGrid()
        ) : postError ? (
          <div className="text-center">
            <p className="text-red-500">
              {postError?.message || "Error loading posts"}
            </p>
            <button
              onClick={() => setRetryCount(retryCount + 1)}
              className="mt-2 text-blue-500"
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
              {insertAdsIntoPosts.length ? (
                insertAdsIntoPosts.map((item, i) => {
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
                        i === insertAdsIntoPosts.length - 1
                          ? lastPostElementRef
                          : null
                      }
                      className="w-full"
                    >
                      <CardOfPost
                        {...item}
                        commentsCount={commentCounts[item._id] ?? 0}
                        loading={
                          (postLoading || publicLoading) &&
                          !selectedPosts.length
                        }
                        categoryMap={categoryMap}
                        postType={item?.postType}
                        isPremium={item?.isPremium}
                        readTime={item?.readTime}
                      />
                    </div>
                  );
                })
              ) : (
                <p className="col-span-full text-center text-gray-500">
                  {filterType === "Following"
                    ? "Follow users to see their posts here. Try exploring suggested users!"
                    : filterType === "Followers"
                    ? "No posts from your followers yet."
                    : filterType === "My Posts"
                    ? "You haven't posted yet. Create your first post!"
                    : "No posts found. Check back later!"}
                </p>
              )}
            </div>
            {(postLoading || publicLoading) && selectedPosts.length > 0 && (
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
