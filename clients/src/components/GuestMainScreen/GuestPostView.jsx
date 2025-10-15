import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPublicPosts, trackGuestVisit } from "../../store/guestSlice";
import GuestCardOfPost from "../Cards/GuestCardOfPost";
import MultiplexAd from "../../Ads/MultiplexAd";
import InFeedAd from "../../Ads/InFeedAd";
import Skeleton from "../Ui/Skeleton";

const POSTS_PER_PAGE = 20;
const SKELETON_COUNT = 12;
const AD_IN_FEED_INTERVAL = 5;
const AD_MULTIPLEX_INTERVAL = 12;

const GuestPostView = () => {
  const dispatch = useDispatch();

  // --- Local State ---
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const observerTargetRef = useRef(null);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef(null);
  const didFetchRef = useRef(false); // ✅ Prevent initial useEffect infinite loop

  // --- Redux ---
  const {
    posts = [],
    loading,
    error,
  } = useSelector((state) => state.guest || {});
  const isSidebarOpen = useSelector(
    (state) => state.postMeta?.isSidebarOpen ?? false
  );

  // --- Grid Layout ---
  const gridClass = useMemo(() => {
    const base =
      "grid gap-4 py-6 px-4 w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
    const responsive = isSidebarOpen
      ? "lg:grid-cols-3 xl:grid-cols-4"
      : "lg:grid-cols-4 xl:grid-cols-5";
    return `${base} ${responsive}`;
  }, [isSidebarOpen]);

  // --- Fetch Posts ---
  const fetchPosts = useCallback(
    async (pageToFetch) => {
      if (isFetchingRef.current || !hasMore) return;
      isFetchingRef.current = true;

      // Cancel any pending fetch
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        // Track guest visit only once
        if (pageToFetch === 1 && !localStorage.getItem("guestId")) {
          await dispatch(trackGuestVisit()).unwrap();
        }

        const result = await dispatch(
          fetchPublicPosts({
            page: pageToFetch,
            limit: POSTS_PER_PAGE,
            signal: controller.signal,
          })
        ).unwrap();

        const fetchedCount = result?.posts?.length ?? 0;

        if (fetchedCount < POSTS_PER_PAGE) {
          setHasMore(false);
        }

        if (fetchedCount > 0) {
          setPage((prev) => prev + 1);
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("GuestPostView fetch error:", err);
        setHasMore(false);
      } finally {
        isFetchingRef.current = false;
        setInitialLoaded(true);
      }
    },
    [dispatch, hasMore]
  );

  // --- Initial Load (only once) ---
  useEffect(() => {
    if (didFetchRef.current) return; // ✅ prevent infinite loop
    didFetchRef.current = true;

    if (!loading && posts.length === 0) {
      fetchPosts(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Infinite Scroll ---
  useEffect(() => {
    if (!observerTargetRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isFetchingRef.current) {
          isFetchingRef.current = true; // lock to prevent duplicate
          fetchPosts(page).finally(() => {
            isFetchingRef.current = false;
          });
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(observerTargetRef.current);
    return () => observer.disconnect();
    // Do NOT include fetchPosts or page to avoid infinite effect loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore]);

  // --- Retry Handler ---
  const handleRetry = useCallback(() => {
    setPage(1);
    setHasMore(true);
    setInitialLoaded(false);
    isFetchingRef.current = false;
    didFetchRef.current = false; // allow re-fetch
    fetchPosts(1);
  }, [fetchPosts]);

  // --- Posts + Ads Composition ---
  const postsWithAds = useMemo(() => {
    return posts.flatMap((post, index) => {
      if (!post?._id) return [];
      const elements = [<GuestCardOfPost key={post._id} post={post} />];

      try {
        if ((index + 1) % AD_IN_FEED_INTERVAL === 0) {
          elements.push(
            <div
              key={`infeed-${post._id}-${index}`}
              className="col-span-1 flex justify-center w-full p-3"
            >
              <div className="w-full max-w-[300px] bg-white dark:bg-gray-800 rounded-xl shadow-md p-3 border border-gray-200 dark:border-gray-700">
                <InFeedAd
                  postId={post._id}
                  testMode={process.env.NODE_ENV !== "production"}
                />
              </div>
            </div>
          );
        }

        if ((index + 1) % AD_MULTIPLEX_INTERVAL === 0) {
          elements.push(
            <div
              key={`multiplex-${post._id}-${index}`}
              className="col-span-full w-full border-b border-gray-300 dark:border-gray-600 my-2 py-4"
            >
              <MultiplexAd
                postId={post._id}
                testMode={process.env.NODE_ENV !== "production"}
              />
            </div>
          );
        }
      } catch (adErr) {
        console.warn("Ad render error:", adErr);
      }

      return elements;
    });
  }, [posts]);

  // --- UI States ---
  if (!initialLoaded && loading && posts.length === 0) {
    return (
      <div className={gridClass} role="status" aria-label="Loading posts">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <Skeleton key={`skeleton-${i}`} />
        ))}
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
            Connection Error
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn’t connect to the server. Please try again.
          </p>
          <button
            onClick={handleRetry}
            className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition duration-150 ease-in-out"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!loading && posts.length === 0 && initialLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
            No Posts Available
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            There are currently no public posts.
          </p>
          <button
            onClick={handleRetry}
            className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition duration-150 ease-in-out"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className={gridClass} role="region" aria-label="Public Posts Feed">
        {postsWithAds}
      </div>

      <div className="text-center py-8">
        {hasMore && (
          <div ref={observerTargetRef} className="h-1 bg-transparent"></div>
        )}

        {loading && posts.length > 0 && (
          <div className={gridClass}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={`skeleton-next-${i}`} />
            ))}
          </div>
        )}

        {!hasMore && !loading && posts.length > 0 && (
          <p className="text-gray-500 dark:text-gray-400">
            You’ve reached the end of the public feed.
          </p>
        )}

        {error && posts.length > 0 && (
          <div className="mt-4">
            <p className="text-red-500 mb-3">Failed to load more posts.</p>
            <button
              onClick={handleRetry}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition duration-150 ease-in-out"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestPostView;
