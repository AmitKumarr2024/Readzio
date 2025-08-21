import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPublicPosts, trackGuestVisit } from "../../store/guestSlice";
import GuestCardOfPost from "../Cards/GuestCardOfPost";
import MultiplexAd from "../../Ads/MultiplexAd";
import InFeedAd from "../../Ads/InFeedAd";
import Skeleton from "../Ui/Skeleton";
import { fetchPostsSequentially } from "../../Utils/fetchPostsSequentially"; // Adjust path as needed

const GuestPostView = () => {
  const dispatch = useDispatch();
  const [initialLoad, setInitialLoad] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  const {
    posts = [],
    loading,
    error,
    page,
    hasMore,
  } = useSelector((state) => state.guest || {});
  const isSidebarOpen = useSelector(
    (state) => state.postMeta?.isSidebarOpen || false
  );

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const guestId = localStorage.getItem("guestId");
        if (!guestId) {
          await dispatch(trackGuestVisit()).unwrap();
        }
        if (posts.length === 0) {
          await dispatch(fetchPublicPosts({ page: 1, limit: 40 })).unwrap(); // Increased initial limit for better UX
        }
      } catch (err) {
        console.error("[GuestPostView] Error loading guest data:", err);
      } finally {
        setInitialLoad(false);
      }
    };
    loadData();
  }, [dispatch, posts.length]);

  // Fetch next page using fetchPostsSequentially
  const fetchNextPage = useCallback(async () => {
    if (loading || isFetching || !hasMore) return;
    setIsFetching(true);
    try {
      await fetchPostsSequentially({
        dispatch,
        posts: [{ page: page + 1, limit: 20 }],
        getThunk: ({ page, limit }) => fetchPublicPosts({ page, limit }),
        delayMs: 300, // Slightly increased delay for smoother network handling
        maxRetries: 2,
        timeoutMs: 10000,
      });
    } catch (err) {
      console.error("[GuestPostView] Error fetching next page:", err);
    } finally {
      setIsFetching(false);
    }
  }, [dispatch, loading, isFetching, page, hasMore]);

  // IntersectionObserver for smooth scroll detection
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !isFetching) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      if (observerRef.current && sentinelRef.current) {
        observerRef.current.unobserve(sentinelRef.current);
      }
    };
  }, [fetchNextPage, loading, isFetching, hasMore]);

  // Fallback scroll handler with debounce
  const handleScroll = useCallback(
    _.debounce(() => {
      if (
        window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 200 &&
        !loading &&
        !isFetching &&
        hasMore
      ) {
        fetchNextPage();
      }
    }, 300),
    [fetchNextPage, loading, isFetching, hasMore]
  );

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Skeleton loading state
  if (loading && initialLoad) {
    return (
      <div
        className={`grid gap-4 py-6 px-4 w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${
          isSidebarOpen
            ? "lg:grid-cols-3 xl:grid-cols-4"
            : "lg:grid-cols-4 xl:grid-cols-5"
        }`}
      >
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="bg-card-bg-light dark:bg-card-bg-dark rounded-lg p-4 shadow-md"
          >
            <Skeleton height="h-40" rounded="rounded-lg" className="mb-3" />
            <Skeleton height="h-5" width="w-3/4" className="mb-2" />
            <Skeleton height="h-4" width="w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error && !initialLoad) {
    return (
      <div className="text-center text-red-500 py-4">
        {error}
        <button
          onClick={() => dispatch(fetchPublicPosts({ page: 1, limit: 40 }))}
          className="ml-2 text-blue-500 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (!initialLoad && (!Array.isArray(posts) || posts.length === 0)) {
    return (
      <div className="text-center text-gray-400 py-8">
        No posts available for guests.
      </div>
    );
  }

  // Insert ads between posts
  const postsWithAds = posts.flatMap((post, index) => {
    if (!post?._id || !post?.slug) {
      console.warn("[GuestPostView] Invalid post at index", index, post);
      return [];
    }

    const items = [<GuestCardOfPost key={post._id} {...post} />];

    if ((index + 1) % 5 === 0) {
      items.push(
        <div
          key={`infeed-${index}`}
          className="col-span-1 flex justify-center w-full p-3 min-w-[250px]"
        >
          <div className="w-full max-w-[300px] bg-white dark:bg-gray-800 rounded-xl shadow-md p-3 border border-gray-200 dark:border-gray-700 transition-all duration-300">
            <InFeedAd postId={post._id} testMode={false} />
          </div>
        </div>
      );
    }

    if ((index + 1) % 12 === 0) {
      items.push(
        <div
          key={`multiplex-${index}`}
          className="col-span-full w-full border-b border-gray-300 dark:border-gray-600 my-2 flex items-center"
        >
          <MultiplexAd postId={post._id} testMode={false} />
        </div>
      );
    }

    return items;
  });

  return (
    <div
      className={`grid gap-4 py-6 px-4 w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${
        isSidebarOpen
          ? "lg:grid-cols-3 xl:grid-cols-4"
          : "lg:grid-cols-4 xl:grid-cols-5"
      }`}
    >
      {postsWithAds}
      {hasMore && (
        <div
          ref={sentinelRef}
          className="col-span-full h-10"
          style={{ visibility: "hidden" }}
        />
      )}
      {(loading || isFetching) && !initialLoad && (
        <div className="col-span-full text-center py-4 animate-fade-in">
          <Skeleton height="h-10" width="w-1/4" className="mx-auto" />
        </div>
      )}
    </div>
  );
};

export default GuestPostView;
