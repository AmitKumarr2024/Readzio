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
  clearCurrentPost,
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
import AdCard from "../../Ads/AdCard";
import AdGuard from "../../Ads/adsGaurd/AdGuard";

// --- CONSTANTS ---
const POSTS_PER_PAGE = 100;
const INITIAL_SKELETON_COUNT = 12;

const Postbox = ({ filterType, category, customPosts = [], user }) => {
  const dispatch = useDispatch();

  // --- Redux State ---
  const {
    posts: authenticatedPosts = [],
    loading: postLoading = false,
    error: postError,
    followingPosts = [],
  } = useSelector((state) => state.post || {});

  const {
    posts: publicPosts = [],
    loading: publicLoading = false,
    hasInitialized: guestInitialized = false,
    publicHasNoPosts = false,
  } = useSelector((state) => state.guest || {});

  const { commentCounts = {}, loading: commentLoading } = useSelector(
    (state) => state.comment || {}
  );
  const { categories = [] } = useSelector((state) => state.categories || {});
  const isSidebarOpen = useSelector(
    (state) => state.postMeta?.isSidebarOpen ?? false
  );
  const currentUser = useSelector((state) => state.auth?.user ?? { _id: null });
  const isAuthenticated = !!currentUser?._id;
  const { followers = { list: [] } } = useSelector(
    (state) => state.follow || {}
  );
  const { socket } = useSelector(selectSocketState);

  // --- Local State ---
  const [currentPage, setCurrentPage] = useState(1);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observer = useRef(null);
  const lastPostElementRef = useRef(null);
  const [displayPosts, setDisplayPosts] = useState([]);

  // --- Component Setup Effects ---

  useEffect(() => {
    dispatch(clearCurrentPost());
  }, [dispatch]);

  const debouncedFetchComments = useMemo(
    () =>
      debounce((postIds) => {
        postIds.forEach((postId) => {
          dispatch(fetchCommentsAndCount(postId));
        });
      }, 1000),
    [dispatch]
  );

  useEffect(() => {
    dispatch(fetchCategories());
    if (isAuthenticated) {
      dispatch(fetchFollowers());
      dispatch(fetchInitialPostCounts());
    }
    setHasInitialized(false);
    setCurrentPage(1);
  }, [dispatch, isAuthenticated, filterType]);

  // --- Data Source Determination ---

  const getSourcePosts = useMemo(() => {
    if (customPosts.length) return customPosts;

    if (isAuthenticated) {
      switch (filterType) {
        case "Following":
          return followingPosts;
        case "My Posts":
          return authenticatedPosts.filter(
            (post) => post.author?._id === user?._id
          );
        case "Followers":
          const followersIds = followers.list.map((u) => u._id);
          return authenticatedPosts.filter(
            (post) =>
              followersIds.includes(String(post.author?._id)) &&
              String(post.author?._id) !== String(currentUser._id)
          );
        default:
          return authenticatedPosts;
      }
    }

    return publicPosts;
  }, [
    customPosts,
    authenticatedPosts,
    followingPosts,
    publicPosts,
    filterType,
    user?._id,
    followers.list,
    currentUser._id,
    isAuthenticated,
  ]);

  const filteredPosts = useMemo(() => {
    let validPosts = getSourcePosts.filter(
      (post) =>
        post?._id &&
        post?.isPublished !== false &&
        !post?.blocked &&
        post?.author &&
        post?.category
    );

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
    }

    return validPosts;
  }, [getSourcePosts, category, categories]);

  useEffect(() => {
    setDisplayPosts(filteredPosts);
  }, [filterType, category, filteredPosts]);

  const dedupedPosts = useMemo(() => {
    const seen = new Set();
    return displayPosts.filter((post) => {
      if (!seen.has(post._id)) {
        seen.add(post._id);
        return true;
      }
      return false;
    });
  }, [displayPosts]);

  const selectedPosts = useMemo(() => {
    return dedupedPosts.map((post) => ({
      ...post,
      category: {
        _id:
          typeof post.category === "string"
            ? post.category
            : post.category?._id || "",
      },
      categoryName:
        categories.find(
          (cat) =>
            cat._id ===
            (typeof post.category === "string"
              ? post.category
              : post.category?._id)
        )?.name || "Uncategorized",
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
  }, [dedupedPosts, categories]);

  // --- Initial Load Logic ---

  const loadInitialPosts = useCallback(async () => {
    if (hasInitialized || customPosts.length > 0) return;

    try {
      const options = { page: 1, limit: POSTS_PER_PAGE };

      let fetchAction;

      if (isAuthenticated) {
        if (filterType === "Following") {
          fetchAction = fetchFollowingPosts(options);
        } else if (filterType === "Followers" && followers.list.length) {
          fetchAction = getAllPosts({
            authorIds: followers.list.map((u) => u._id),
            ...options,
          });
        } else if (filterType === "My Posts" && user?._id) {
          fetchAction = getAllPosts({ userId: user._id, ...options });
        } else {
          fetchAction = getAllPosts(options);
        }
      } else {
        if (guestInitialized) {
          setHasInitialized(true);
          return;
        }
        fetchAction = fetchPublicPosts(options);
      }

      await dispatch(fetchAction).unwrap();
      setHasInitialized(true);
    } catch (e) {
      console.error("Failed to load initial posts:", e);
      setHasInitialized(true);
    }
  }, [
    dispatch,
    isAuthenticated,
    filterType,
    followers.list,
    user?._id,
    guestInitialized,
    hasInitialized,
    customPosts.length,
  ]);

  useEffect(() => {
    loadInitialPosts();
  }, [loadInitialPosts]);

  // --- Ad Insertion Logic (FIXED) ---

  const screenWidth = useWindowWidth();

  const insertAdsIntoPosts = useCallback((posts) => {
    const items = [];
    let postCounter = 0;

    for (let i = 0; i < posts.length; i++) {
      items.push(posts[i]);
      postCounter++;

      // Insert card ad every 6 posts (not counting multiplex ads)
      if (postCounter % 6 === 0 && postCounter > 0) {
        items.push({
          type: "card-ad",
          id: `card-ad-${posts[i]._id}-${i}`,
          postId: posts[i]._id,
        });
      }

      // Insert multiplex ad every 12 posts (not counting card ads)
      if (postCounter % 13 === 0 && postCounter > 0) {
        items.push({
          type: "multiplex-ad",
          id: `multiplex-ad-${posts[i]._id}-${i}`,
          postId: posts[i]._id,
        });
      }
    }

    return items;
  }, []);

  const itemsWithAds = useMemo(
    () => insertAdsIntoPosts(selectedPosts),
    [selectedPosts, insertAdsIntoPosts]
  );

  // --- Load More Posts ---

  const hasMore = useMemo(
    () => dedupedPosts.length === currentPage * POSTS_PER_PAGE,
    [dedupedPosts.length, currentPage]
  );

  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore || !hasInitialized) return;

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    const options = { page: nextPage, limit: POSTS_PER_PAGE };

    try {
      if (isAuthenticated) {
        let fetchAction;
        if (filterType === "Following") {
          fetchAction = fetchFollowingPosts(options);
        } else if (filterType === "Followers" && followers.list.length) {
          fetchAction = getAllPosts({
            authorIds: followers.list.map((user) => user._id),
            ...options,
          });
        } else if (filterType === "My Posts" && user?._id) {
          fetchAction = getAllPosts({ userId: user._id, ...options });
        } else {
          fetchAction = getAllPosts(options);
        }
        await dispatch(fetchAction).unwrap();
      } else {
        await dispatch(fetchPublicPosts(options)).unwrap();
      }
      setCurrentPage(nextPage);
    } catch (e) {
      console.error("Failed to load more posts:", e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    dispatch,
    currentPage,
    isLoadingMore,
    hasMore,
    hasInitialized,
    filterType,
    followers.list,
    user?._id,
    isAuthenticated,
  ]);

  // --- Intersection Observer ---

  useEffect(() => {
    if (
      !lastPostElementRef.current ||
      !hasMore ||
      !hasInitialized ||
      isLoadingMore
    )
      return;

    observer.current?.disconnect();

    observer.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMorePosts();
        }
      },
      { threshold: 0.2 }
    );

    observer.current.observe(lastPostElementRef.current);

    return () => observer.current?.disconnect();
  }, [hasMore, hasInitialized, isLoadingMore, loadMorePosts]);

  // --- Retry Handler ---

  const handleRetry = useCallback(() => {
    setHasInitialized(false);
    setCurrentPage(1);
  }, []);

  // --- Conditional Rendering Logic ---

  const renderSkeletonGrid = () => (
    <div
      className={`grid gap-4 py-6 w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${
        isSidebarOpen
          ? "lg:grid-cols-3 xl:grid-cols-4"
          : "lg:grid-cols-3 xl:grid-cols-5"
      }`}
    >
      {Array.from({ length: INITIAL_SKELETON_COUNT }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-64 w-full rounded-lg bg-gray-200 dark:bg-gray-700"
        />
      ))}
    </div>
  );

  const currentLoading = isAuthenticated ? postLoading : publicLoading;
  const shouldShowInitialLoader = currentLoading && !hasInitialized;
  const currentError = isAuthenticated ? postError : null;
  const shouldShowError =
    currentError && hasInitialized && selectedPosts.length === 0;
  const shouldShowEmpty =
    hasInitialized &&
    selectedPosts.length === 0 &&
    !currentLoading &&
    !currentError;

  // --- Main Render ---
  return (
    <ErrorBoundary>
      <div className="w-full px-4 py-4">
        <Sorted
          posts={filteredPosts}
          onSortChange={(sortedPosts) => setDisplayPosts(sortedPosts)}
        />

        {/* INITIAL LOADING STATE */}
        {shouldShowInitialLoader && renderSkeletonGrid()}

        {/* ERROR STATE */}
        {shouldShowError && (
          <div className="flex items-center justify-center min-h-[60vh] px-4">
            <div className="max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
              <svg
                className="w-20 h-20 mx-auto mb-4 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
                Error Loading Posts
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {currentError?.message || "Failed to load posts"}
              </p>
              <button
                onClick={handleRetry}
                className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition duration-150 ease-in-out"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {shouldShowEmpty && (
          <div className="flex items-center justify-center min-h-[60vh] px-4">
            <div className="max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
              <svg
                className="w-24 h-24 mx-auto mb-6 text-gray-300 dark:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
                {filterType === "Following"
                  ? "No Posts from Following"
                  : filterType === "My Posts"
                  ? "You Haven't Posted Yet"
                  : "No Posts Available"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {filterType === "Following"
                  ? "Follow users to see their posts here."
                  : filterType === "My Posts"
                  ? "Start creating your first post!"
                  : "Check back later for new content."}
              </p>
              <button
                onClick={handleRetry}
                className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition duration-150 ease-in-out"
              >
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* POSTS GRID - FIXED LAYOUT */}
        {!shouldShowInitialLoader && !shouldShowError && !shouldShowEmpty && (
          <>
            <div
              className={`grid gap-4 py-6 w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${
                isSidebarOpen
                  ? "lg:grid-cols-3 xl:grid-cols-4"
                  : "lg:grid-cols-3 xl:grid-cols-5"
              }`}
            >
              {itemsWithAds.map((item, i) => {
                // Card Ad - Takes single grid cell
                if (item.type === "card-ad") {
                  return (
                    <div
                      key={item.id}
                      className="w-full h-full flex items-center justify-center"
                    >
                      <AdCard postId={item?.postId} />
                    </div>
                  );
                }

                // Multiplex Ad - Spans full width
                if (item.type === "multiplex-ad") {
                  return (
                    <div
                      key={item.id}
                      className="col-span-full w-full my-4 py-4 border-y border-gray-200 dark:border-gray-700"
                    >
                      <AdGuard placement="multiplex">
                        <MultiplexAd postId={item.postId} testMode={false} />
                      </AdGuard>
                    </div>
                  );
                }

                // Regular Post Card
                return (
                  <div
                    key={item._id}
                    className="w-full"
                    ref={
                      i === itemsWithAds.length - 1 ? lastPostElementRef : null
                    }
                  >
                    <CardOfPost
                      {...item}
                      commentsCount={commentCounts[item._id] ?? 0}
                      loading={false}
                      categoryMap={categories}
                      postType={item?.postType}
                      isPremium={item?.isPremium}
                      readTime={item?.readTime}
                    />
                  </div>
                );
              })}
            </div>

            {/* LOADING MORE INDICATOR */}
            {isLoadingMore && (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {/* NO MORE POSTS INDICATOR */}
            {!hasMore && dedupedPosts.length > 0 && (
              <div className="flex justify-center py-8 text-gray-500 dark:text-gray-400 font-medium">
                That's all for now!
              </div>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Postbox;
