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
  const isAuthenticated = !!currentUser._id;
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
  }, [sortedPosts, categories]);

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
      if (postCounter % 12 === 0 && postCounter > 0) {
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
    () => sortedPosts.length === currentPage * POSTS_PER_PAGE,
    [sortedPosts.length, currentPage]
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
    if (!lastPostElementRef.current || !hasMore || !hasInitialized) return;

    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    observer.current.observe(lastPostElementRef.current);

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [loadMorePosts, hasMore, hasInitialized, isLoadingMore]);

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
        <Sorted posts={filteredPosts} onSortChange={() => {}} />

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
                      <MultiplexAd postId={item.postId} testMode={false} />
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
            {!hasMore && sortedPosts.length > 0 && (
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

//---------------------- old code--------------------------------------
// import React, {
//   useState,
//   useEffect,
//   useMemo,
//   useRef,
//   useCallback,
// } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import { debounce } from "lodash";
// import CardOfPost from "../Cards/CardOfPost";
// import {
//   getAllPosts,
//   fetchFollowingPosts,
//   clearCurrentPost,
// } from "../../store/postSlice";
// import { fetchCommentsAndCount } from "../../store/commentSlice";
// import { fetchCategories } from "../../store/categorySlice";
// import { fetchFollowers } from "../../store/followSlice";
// import {
//   selectSocketState,
//   fetchInitialPostCounts,
// } from "../../store/socketSlice";
// // IMPORTANT: Assuming fetchPublicPosts also handles guest tracking
// import { fetchPublicPosts } from "../../store/guestSlice";
// import Sorted from "../Tabs/Sorted";
// import ErrorBoundary from "./ErrorBoundary";
// import Skeleton from "@/components/Ui/Skeleton";
// import MultiplexAd from "../../Ads/MultiplexAd";
// import SafeInFeedAd from "../../Ads/SafeInFeedAd";
// import useWindowWidth from "../../Utils/useWindowWidth";
// import AdCard from "../../Ads/AdCard";

// // --- CONSTANTS ---
// const POSTS_PER_PAGE = 100;
// const INITIAL_SKELETON_COUNT = 12;

// const Postbox = ({ filterType, category, customPosts = [], user }) => {
//   const dispatch = useDispatch();

//   // --- Redux State ---
//   const {
//     posts: authenticatedPosts = [], // Renamed for clarity
//     loading: postLoading = false,
//     error: postError,
//     followingPosts = [],
//   } = useSelector((state) => state.post || {});

//   const {
//     posts: publicPosts = [],
//     loading: publicLoading = false,
//     hasInitialized: guestInitialized = false,
//     // Renamed isEmpty to publicHasNoPosts to reflect its true purpose
//     publicHasNoPosts = false,
//   } = useSelector((state) => state.guest || {});

//   const { commentCounts = {}, loading: commentLoading } = useSelector(
//     (state) => state.comment || {}
//   );
//   const { categories = [] } = useSelector((state) => state.categories || {});
//   const isSidebarOpen = useSelector(
//     (state) => state.postMeta?.isSidebarOpen ?? false
//   );
//   const currentUser = useSelector((state) => state.auth?.user ?? { _id: null });
//   const isAuthenticated = !!currentUser._id;
//   const { followers = { list: [] } } = useSelector(
//     (state) => state.follow || {}
//   );
//   const { socket } = useSelector(selectSocketState);

//   // --- Local State ---
//   const [currentPage, setCurrentPage] = useState(1);
//   // This state tracks when the *initial* fetch for the current filter type is complete.
//   const [hasInitialized, setHasInitialized] = useState(false);
//   const [isLoadingMore, setIsLoadingMore] = useState(false);
//   const observer = useRef(null);
//   const lastPostElementRef = useRef(null);

//   // --- Component Setup Effects ---

//   // 1. Clear stuck post state on mount
//   useEffect(() => {
//     dispatch(clearCurrentPost());
//   }, [dispatch]);

//   // 2. Debounced fetch for comments (Memoized)
//   const debouncedFetchComments = useMemo(
//     () =>
//       debounce((postIds) => {
//         postIds.forEach((postId) => {
//           dispatch(fetchCommentsAndCount(postId));
//         });
//       }, 1000),
//     [dispatch]
//   );

//   // 3. Initialize categories and followers ONCE
//   useEffect(() => {
//     dispatch(fetchCategories());
//     if (isAuthenticated) {
//       dispatch(fetchFollowers());
//       dispatch(fetchInitialPostCounts());
//     }
//     // IMPORTANT: Reset initialization flag when filter/auth changes
//     setHasInitialized(false);
//     setCurrentPage(1);
//   }, [dispatch, isAuthenticated, filterType]); // DEPENDS on filterType now

//   // --- Data Source Determination (Memoized) ---

//   const getSourcePosts = useMemo(() => {
//     if (customPosts.length) return customPosts;

//     // LOGGED IN USER logic
//     if (isAuthenticated) {
//       switch (filterType) {
//         case "Following":
//           return followingPosts;
//         // The filtering logic for 'My Posts' and 'Followers' should ideally be done
//         // by the server when calling `getAllPosts`, but we keep local filtering for now.
//         case "My Posts":
//           return authenticatedPosts.filter(
//             (post) => post.author?._id === user?._id
//           );
//         case "Followers":
//           const followersIds = followers.list.map((u) => u._id);
//           return authenticatedPosts.filter(
//             (post) =>
//               followersIds.includes(String(post.author?._id)) &&
//               String(post.author?._id) !== String(currentUser._id)
//           );
//         default:
//           return authenticatedPosts;
//       }
//     }

//     // GUEST USER logic
//     return publicPosts;
//   }, [
//     customPosts,
//     authenticatedPosts,
//     followingPosts,
//     publicPosts,
//     filterType,
//     user?._id,
//     followers.list,
//     currentUser._id,
//     isAuthenticated,
//   ]);

//   // Filtered/Sorted Posts (Kept as-is, assuming correct)
//   const filteredPosts = useMemo(() => {
//     // ... (Your filtering logic remains here) ...
//     let validPosts = getSourcePosts.filter(
//       (post) =>
//         post?._id &&
//         post?.isPublished !== false &&
//         !post?.blocked &&
//         post?.author &&
//         post?.category
//     );

//     if (category) {
//       validPosts = validPosts.filter((post) => {
//         let postCategorySlug = "";
//         if (typeof post.category === "object" && post.category?.slug) {
//           postCategorySlug = post.category.slug.toLowerCase();
//         } else if (typeof post.category === "string") {
//           const matched = categories.find((cat) => cat._id === post.category);
//           if (matched) postCategorySlug = matched.slug?.toLowerCase();
//         }
//         return postCategorySlug === category.toLowerCase();
//       });
//     }

//     return validPosts;
//   }, [getSourcePosts, category, categories]);

//   const sortedPosts = useMemo(() => {
//     const seen = new Set();
//     return filteredPosts.filter((post) => {
//       if (post?._id && !seen.has(post._id)) {
//         seen.add(post._id);
//         return true;
//       }
//       return false;
//     });
//   }, [filteredPosts]);

//   const selectedPosts = useMemo(() => {
//     // ... (Your metadata mapping logic remains here) ...
//     return sortedPosts.map((post) => ({
//       ...post,
//       category: {
//         _id:
//           typeof post.category === "string"
//             ? post.category
//             : post.category?._id || "",
//       },
//       categoryName:
//         categories.find(
//           (cat) =>
//             cat._id ===
//             (typeof post.category === "string"
//               ? post.category
//               : post.category?._id)
//         )?.name || "Uncategorized",
//       likesCount: post?.likes?.length ?? 0,
//       viewsCount: post?.viewsCount ?? 0,
//       bookmarksCount: post?.bookmarksCount ?? 0,
//       shareCount: post?.shareCount ?? 0,
//       isSubscriberOnly: post?.isSubscriberOnly ?? false,
//       postType: post?.postType || "Article",
//       isPremium: post?.isPremium ?? false,
//       tags: post?.tags || [],
//       readTime: post?.readTime,
//     }));
//   }, [sortedPosts, categories]);

//   // --- Initial Load Logic (Fixed) ---

//   const loadInitialPosts = useCallback(async () => {
//     // This runs on mount or when filterType/Auth changes (due to the dependency in useEffect 3)
//     if (hasInitialized || customPosts.length > 0) return;

//     try {
//       const options = { page: 1, limit: POSTS_PER_PAGE };

//       let fetchAction;

//       if (isAuthenticated) {
//         if (filterType === "Following") {
//           fetchAction = fetchFollowingPosts(options);
//         } else if (filterType === "Followers" && followers.list.length) {
//           fetchAction = getAllPosts({
//             authorIds: followers.list.map((u) => u._id),
//             ...options,
//           });
//         } else if (filterType === "My Posts" && user?._id) {
//           fetchAction = getAllPosts({ userId: user._id, ...options });
//         } else {
//           fetchAction = getAllPosts(options);
//         }
//       } else {
//         // For guests, only fetch if the guest slice hasn't already initialized
//         if (guestInitialized) {
//           setHasInitialized(true); // Skip fetch, use existing Redux data
//           return;
//         }
//         fetchAction = fetchPublicPosts(options);
//       }

//       await dispatch(fetchAction).unwrap();

//       // Successfully fetched, set initialized
//       setHasInitialized(true);
//     } catch (e) {
//       console.error("Failed to load initial posts:", e);
//       // IMPORTANT: Even on error, mark as initialized to stop retry loop
//       setHasInitialized(true);
//     }
//   }, [
//     dispatch,
//     isAuthenticated,
//     filterType,
//     followers.list,
//     user?._id,
//     guestInitialized,
//     hasInitialized,
//     customPosts.length,
//   ]);

//   // Use the new simplified initialization logic
//   useEffect(() => {
//     loadInitialPosts();
//   }, [loadInitialPosts]);

//   // --- Ad Insertion and Infinite Scroll Logic (Kept as-is, assuming correct) ---

//   const screenWidth = useWindowWidth();

//   const insertAdsIntoPosts = useCallback(
//     (posts) => {
//       const result = [...posts];
//       const items = [];
//       // Ad frequency logic
//       let adFrequency = 9;
//       if (screenWidth < 1024 && screenWidth >= 768) adFrequency = 8;
//       // NOTE: Your original ad logic was `(i + 1) % 6 === 0`, not using `adFrequency`.
//       // We'll stick to the original logic for safety here:

//       for (let i = 0; i < result.length; i++) {
//         items.push(result[i]);
//         if ((i + 1) % 5 === 0) {
//           items.push({
//             type: "card-ad",
//             id: `card-ad-${result[i]._id}-${i}`,
//             postId: result[i]._id,
//           });
//         }
//         // Add a multiplex ad (example: every 18 posts, must span full width)
//         if ((i + 1) % 9 === 0) {
//           items.push({
//             type: "multiplex-ad",
//             id: `multiplex-ad-${result[i]._id}-${i}`,
//             postId: result[i]._id,
//           });
//         }
//       }
//       return items;
//     },
//     [screenWidth]
//   );

//   const itemsWithAds = useMemo(
//     () => insertAdsIntoPosts(selectedPosts),
//     [selectedPosts, insertAdsIntoPosts]
//   );

//   // Load More Posts
//   // The `hasMore` logic is *flawed* if your Redux slice doesn't clear the array
//   // when a new filter is selected. It should ideally compare post count to total count.
//   // We keep the existing logic for now, but note it's a potential bug if the server doesn't
//   // return an empty array when there are no more posts (which would stop the fetch anyway).
//   const hasMore = useMemo(
//     () => sortedPosts.length === currentPage * POSTS_PER_PAGE,
//     [sortedPosts.length, currentPage]
//   );

//   const loadMorePosts = useCallback(async () => {
//     // Guards against running multiple times or if no more data/not initialized
//     if (isLoadingMore || !hasMore || !hasInitialized) return;

//     setIsLoadingMore(true);
//     const nextPage = currentPage + 1;
//     const options = { page: nextPage, limit: POSTS_PER_PAGE };

//     try {
//       if (isAuthenticated) {
//         // ... (Your authentication fetch logic remains here) ...
//         let fetchAction;
//         if (filterType === "Following") {
//           fetchAction = fetchFollowingPosts(options);
//         } else if (filterType === "Followers" && followers.list.length) {
//           fetchAction = getAllPosts({
//             authorIds: followers.list.map((user) => user._id),
//             ...options,
//           });
//         } else if (filterType === "My Posts" && user?._id) {
//           fetchAction = getAllPosts({ userId: user._id, ...options });
//         } else {
//           fetchAction = getAllPosts(options);
//         }
//         await dispatch(fetchAction).unwrap();
//       } else {
//         await dispatch(fetchPublicPosts(options)).unwrap();
//       }
//       setCurrentPage(nextPage);
//     } catch (e) {
//       console.error("Failed to load more posts:", e);
//     } finally {
//       setIsLoadingMore(false);
//     }
//   }, [
//     dispatch,
//     currentPage,
//     isLoadingMore,
//     hasMore,
//     hasInitialized,
//     filterType,
//     followers.list,
//     user?._id,
//     isAuthenticated,
//   ]);

//   // Intersection Observer for Infinite Scroll
//   useEffect(() => {
//     if (!lastPostElementRef.current || !hasMore || !hasInitialized) return;

//     // Disconnect old observer before creating a new one (cleanup)
//     if (observer.current) {
//       observer.current.disconnect();
//     }

//     observer.current = new IntersectionObserver(
//       (entries) => {
//         if (entries[0].isIntersecting && !isLoadingMore) {
//           loadMorePosts();
//         }
//       },
//       { threshold: 0.1 }
//     );

//     observer.current.observe(lastPostElementRef.current);

//     return () => {
//       if (observer.current) {
//         observer.current.disconnect();
//       }
//     };
//   }, [loadMorePosts, hasMore, hasInitialized, isLoadingMore]);

//   // Retry Handler (Resets state and triggers a new initial load)
//   const handleRetry = useCallback(() => {
//     setHasInitialized(false);
//     setCurrentPage(1);
//     // loadInitialPosts will be called by useEffect([loadInitialPosts])
//   }, []);

//   // --- Conditional Rendering Logic (Perfected) ---

//   const renderSkeletonGrid = () => (
//     <div
//       className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${
//         isSidebarOpen
//           ? "lg:grid-cols-3 xl:grid-cols-4"
//           : "lg:grid-cols-3 xl:grid-cols-5"
//       } gap-4 py-6 w-full`}
//     >
//       {Array.from({ length: INITIAL_SKELETON_COUNT }).map((_, i) => (
//         <Skeleton
//           key={i}
//           className="h-64 w-full rounded-lg bg-gray-200 dark:bg-gray-700"
//         />
//       ))}
//     </div>
//   );

//   // 1. Determine General Loading State
//   // Use the appropriate loading state based on authentication
//   const currentLoading = isAuthenticated ? postLoading : publicLoading;

//   // 2. Determine Initial Loader Visibility
//   // Show initial loader if we are loading AND the first page is not ready
//   const shouldShowInitialLoader = currentLoading && !hasInitialized;

//   // 3. Determine Error State Visibility
//   // Show error if we've initialized (or failed to) AND have no posts
//   const currentError = isAuthenticated ? postError : null; // Guest error is often handled by guestSlice
//   const shouldShowError =
//     currentError && hasInitialized && selectedPosts.length === 0;

//   // 4. Determine Empty State Visibility
//   // Show empty if we've initialized AND have no posts AND are not currently loading
//   const shouldShowEmpty =
//     hasInitialized &&
//     selectedPosts.length === 0 &&
//     !currentLoading &&
//     !currentError;

//   // --- Main Render ---
//   return (
//     <ErrorBoundary>
//       <div className="w-full px-4 py-4">
//         <Sorted posts={filteredPosts} onSortChange={() => {}} />

//         {/* 1. INITIAL LOADING STATE */}
//         {shouldShowInitialLoader && renderSkeletonGrid()}

//         {/* 2. ERROR STATE */}
//         {shouldShowError && (
//           <div className="flex items-center justify-center min-h-[60vh] px-4">
//             {/* ... (Your error rendering logic) ... */}
//             <div className="max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
//               <svg
//                 className="w-20 h-20 mx-auto mb-4 text-red-500"
//                 fill="none"
//                 stroke="currentColor"
//                 viewBox="0 0 24 24"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
//                 />
//               </svg>
//               <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
//                 Error Loading Posts
//               </h3>
//               <p className="text-gray-600 dark:text-gray-400 mb-6">
//                 {currentError?.message || "Failed to load posts"}
//               </p>
//               <button
//                 onClick={handleRetry}
//                 className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition duration-150 ease-in-out"
//               >
//                 Try Again
//               </button>
//             </div>
//           </div>
//         )}

//         {/* 3. EMPTY STATE (This is what you asked to fix!) */}
//         {shouldShowEmpty && (
//           <div className="flex items-center justify-center min-h-[60vh] px-4">
//             {/* ... (Your empty state rendering logic) ... */}
//             <div className="max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
//               <svg
//                 className="w-24 h-24 mx-auto mb-6 text-gray-300 dark:text-gray-600"
//                 fill="none"
//                 stroke="currentColor"
//                 viewBox="0 0 24 24"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={1.5}
//                   d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
//                 />
//               </svg>
//               <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
//                 {filterType === "Following"
//                   ? "No Posts from Following"
//                   : filterType === "My Posts"
//                   ? "You Haven't Posted Yet"
//                   : "No Posts Available"}
//               </h3>
//               <p className="text-gray-600 dark:text-gray-400 mb-6">
//                 {filterType === "Following"
//                   ? "Follow users to see their posts here."
//                   : filterType === "My Posts"
//                   ? "Start creating your first post!"
//                   : "Check back later for new content."}
//               </p>
//               <button
//                 onClick={handleRetry}
//                 className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition duration-150 ease-in-out"
//               >
//                 Refresh
//               </button>
//             </div>
//           </div>
//         )}

//         {/* 4. POSTS GRID */}
//         {!shouldShowInitialLoader && !shouldShowError && !shouldShowEmpty && (
//           <>
//             <div
//               className={`grid gap-4 py-6 w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${
//                 isSidebarOpen
//                   ? "lg:grid-cols-3 xl:grid-cols-4"
//                   : "lg:grid-cols-3 xl:grid-cols-5"
//               }`}
//             >
//               {itemsWithAds.map((item, i) => {
//                 // ... (Your CardOfPost/Ad rendering logic remains here) ...
//                 if (item.type === "card-ad") {
//                   return (
//                     <div key={item.id} className="w-full">
//                       <AdCard postId={item?.postId} />
//                     </div>
//                   );
//                 }
//                 if (item.type === "multiplex-ad") {
//                   return (
//                     <div
//                       key={item.id}
//                       className="col-span-full w-full border-t border-b border-gray-300 dark:border-gray-600 my-4"
//                     >
//                       <MultiplexAd postId={item.postId} testMode={false} />
//                     </div>
//                   );
//                 }
//                 return (
//                   <div
//                     key={item._id}
//                     className="w-full"
//                     ref={
//                       i === itemsWithAds.length - 1 ? lastPostElementRef : null
//                     }
//                   >
//                     <CardOfPost
//                       {...item}
//                       commentsCount={commentCounts[item._id] ?? 0}
//                       loading={false}
//                       categoryMap={categories} // Pass categories directly if CardOfPost handles mapping
//                       postType={item?.postType}
//                       isPremium={item?.isPremium}
//                       readTime={item?.readTime}
//                     />
//                   </div>
//                 );
//               })}
//             </div>

//             {/* LOADING MORE INDICATOR */}
//             {isLoadingMore && (
//               <div className="flex justify-center py-8">
//                 <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
//               </div>
//             )}

//             {/* NO MORE POSTS INDICATOR */}
//             {!hasMore && sortedPosts.length > 0 && (
//               <div className="flex justify-center py-8 text-gray-500 dark:text-gray-400">
//                 That's all for now!
//               </div>
//             )}
//           </>
//         )}
//       </div>
//     </ErrorBoundary>
//   );
// };

// export default Postbox;
