// GuestPostView.js
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPublicPosts,
  trackGuestVisit,
  clearGuestError,
} from "../../store/guestSlice";
import GuestCardOfPost from "../Cards/GuestCardOfPost";
import MultiplexAd from "../../Ads/MultiplexAd";
import InFeedAd from "../../Ads/InFeedAd";
import Skeleton from "../Ui/Skeleton";
import GuestLoginModal from "../../AppRootFile/components/GuestLoginModal";

const GuestPostView = () => {
  const dispatch = useDispatch();
  const {
    posts = [],
    loading,
    error,
    page,
    total,
    hasMore,
  } = useSelector((state) => state.guest || {});
  const isSidebarOpen = useSelector(
    (state) => state.postMeta?.isSidebarOpen || false
  );
  const observerRef = useRef();
  const [fetchAttempted, setFetchAttempted] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (fetchAttempted) return; // Prevent multiple fetch attempts
      setFetchAttempted(true);
      try {
        console.log("[GuestPostView] Initializing data load...");
        const guestId = localStorage.getItem("guestId");
        if (!guestId) {
          console.log("[GuestPostView] No guestId, tracking visit...");
          await dispatch(trackGuestVisit()).unwrap();
        }
        console.log("[GuestPostView] Fetching posts, page: 1, limit: 12");
        await dispatch(fetchPublicPosts({ page: 1, limit: 12 })).unwrap();
      } catch (err) {
        console.error("[GuestPostView] Error loading data:", err);
      }
    };
    loadData();
  }, [dispatch, fetchAttempted]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          console.log(
            "[GuestPostView] Scrolled to bottom, fetching page:",
            page + 1
          );
          dispatch(fetchPublicPosts({ page: page + 1, limit: 12 }));
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [dispatch, page, hasMore, loading]);

  // Debug state
  console.log("[GuestPostView] State:", {
    posts: posts.length,
    loading,
    error,
    page,
    total,
    hasMore,
    postsSample: posts.slice(0, 2),
  });

  // Error state
  if (
    !loading &&
    error &&
    error !== "Too many guest visits, please try again later"
  ) {
    return (
      <div className="text-center text-red-500 py-4">
        {error}
        <button
          onClick={() => {
            console.log("[GuestPostView] Retrying fetch, page: 1");
            dispatch(clearGuestError());
            setFetchAttempted(false); // Allow retry
          }}
          className="ml-2 text-blue-500 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (!loading && posts.length === 0) {
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
    <div className="container mx-auto px-4 py-8">
      <GuestLoginModal />
      <div
        className={`grid gap-4 py-6 w-full
          grid-cols-1 
          sm:grid-cols-2 
          md:grid-cols-3 
          ${
            isSidebarOpen
              ? "lg:grid-cols-3 xl:grid-cols-4"
              : "lg:grid-cols-4 xl:grid-cols-5"
          }
        `}
      >
        {postsWithAds.length > 0
          ? postsWithAds
          : !loading && (
              <div className="col-span-full text-center text-gray-400 py-8">
                No posts to display.
              </div>
            )}
        {loading &&
          Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="bg-card-bg-light dark:bg-card-bg-dark rounded-lg p-4 shadow-md"
            >
              <Skeleton height="h-40" rounded="rounded-lg" className="mb-3" />
              <Skeleton height="h-5" width="w-3/4" className="mb-2" />
              <Skeleton height="h-4" width="w-1/2" />
            </div>
          ))}
      </div>
      {hasMore && posts.length > 0 && (
        <div ref={observerRef} className="h-10" />
      )}
      {!hasMore && posts.length > 0 && (
        <div className="text-center text-gray-400 py-4">
          No more posts to load
        </div>
      )}
    </div>
  );
};

export default GuestPostView;
