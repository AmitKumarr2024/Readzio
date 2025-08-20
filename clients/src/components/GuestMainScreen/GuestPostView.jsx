import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPublicPosts, trackGuestVisit } from "../../store/guestSlice";
import GuestCardOfPost from "../Cards/GuestCardOfPost";
import MultiplexAd from "../../Ads/MultiplexAd";
import InFeedAd from "../../Ads/InFeedAd";
import Skeleton from "../Ui/Skeleton";

const GuestPostView = () => {
  const dispatch = useDispatch();
  const [initialLoad, setInitialLoad] = useState(true);

  const {
    posts = [],
    loading,
    error,
  } = useSelector((state) => state.guest || {});
  const isSidebarOpen = useSelector(
    (state) => state.postMeta?.isSidebarOpen || false
  );

  // Watch for posts update - useful for debugging
  // useEffect(() => {
  //   console.log("[GuestPostView] Redux guest.posts updated:", posts);
  // }, [posts]);

  // Load guest data and posts
  useEffect(() => {
    const loadData = async () => {
      try {
        // Track guest visit if no guestId exists
        const guestId = localStorage.getItem("guestId");
        if (!guestId) {
          // console.log("[GuestPostView] No guestId found, tracking visit...");
          await dispatch(trackGuestVisit()).unwrap();
        } else {
          console.log("[GuestPostView] GuestId already exists:", guestId);
        }

        // Fetch posts only if none exist
        // if (posts.length === 0) {
        //   console.log("[GuestPostView] Fetching public posts...");
        //   const result = await dispatch(
        //     fetchPublicPosts({ page: 1, limit: 12 })
        //   ).unwrap();
        //   console.log("[GuestPostView] Fetch result:", result);
        // } else {
        //   console.log("[GuestPostView] Posts already loaded:", posts.length);
        // }
      } catch (err) {
        console.error("[GuestPostView] Error loading guest data:", err);
      } finally {
        // console.log("[GuestPostView] Setting initialLoad to false");
        setInitialLoad(false);
      }
    };
    loadData();
  }, [dispatch, posts.length]);

  // Skeleton loading state
  if (loading && initialLoad) {
    // console.log("[GuestPostView] Rendering skeleton loading state");
    return (
      <div
        className={`grid gap-4 py-6 px-4 w-full
          grid-cols-1 
          sm:grid-cols-2 
          md:grid-cols-3 
          ${
            isSidebarOpen
              ? "lg:grid-cols-3 xl:grid-cols-4"
              : "lg:grid-cols-3 xl:grid-cols-5"
          }
        `}
      >
        {Array.from({ length: 12 }).map((_, i) => (
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
    // console.log("[GuestPostView] Rendering error state:", error);
    return (
      <div className="text-center text-red-500 py-4">
        {error}
        <button
          onClick={() => {
            // console.log("[GuestPostView] Retrying fetchPublicPosts");
            dispatch(fetchPublicPosts({ page: 1, limit: 12 }));
          }}
          className="ml-2 text-blue-500 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (!initialLoad && (!Array.isArray(posts) || posts.length === 0)) {
    // console.log("[GuestPostView] Rendering empty state");
    return (
      <div className="text-center text-gray-400 py-8">
        No posts available for guests.
      </div>
    );
  }

  // Insert ads between posts
  // console.log(
  //   "[GuestPostView] Rendering posts with ads, posts count:",
  //   posts.length
  // );
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
      className={`grid gap-4 py-6 px-4 w-full
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
      {postsWithAds}
    </div>
  );
};

export default GuestPostView;
