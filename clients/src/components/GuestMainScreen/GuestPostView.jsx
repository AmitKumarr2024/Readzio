import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPublicPosts } from "../../store/guestSlice";
import GuestCardOfPost from "../Cards/GuestCardOfPost";
import MultiplexAd from "../../Ads/MultiplexAd";
import InFeedAd from "../../Ads/InFeedAd";

const GuestPostView = () => {
  const dispatch = useDispatch();
  const {
    posts = [],
    loading,
    error,
  } = useSelector((state) => state.guest || {});
  const isSidebarOpen = useSelector(
    (state) => state.postMeta?.isSidebarOpen || false
  );

  useEffect(() => {
    dispatch(fetchPublicPosts({ page: 1, limit: 12 }));
  }, [dispatch]);

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">Loading posts...</div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-4">
        {error}
        <button
          onClick={() => dispatch(fetchPublicPosts({ page: 1, limit: 12 }))}
          className="ml-2 text-blue-500 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!Array.isArray(posts) || posts.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No posts available for guests.
      </div>
    );
  }

  const postsWithAds = posts.flatMap((post, index) => {
    if (!post?._id || !post.slug) return [];

    const items = [<GuestCardOfPost key={post._id} {...post} />];

    // Insert In-Feed Ad after every 8 posts
    if ((index + 1) % 8 === 0) {
      items.push(
        <div
          key={`infeed-${index}`}
          className="col-span-1 flex justify-center w-full p-3"
        >
          <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-3 border border-gray-200 dark:border-gray-700 transition-all duration-300">
            <InFeedAd postId={post._id} testMode={true} />
            <p className="mt-2 text-xs text-center text-gray-400 dark:text-gray-500">Sponsored</p>
          </div>
        </div>
      );
    }

    // Insert Multiplex Ad after every 12 posts
    if ((index + 1) % 12 === 0) {
      items.push(
        <div
          key={`multiplex-${index}`}
          className="col-span-full flex justify-center w-full p-3"
        >
          <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700 transition-all duration-300">
            <MultiplexAd postId={post._id} testMode={true} />
          </div>
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
        ${isSidebarOpen ? "lg:grid-cols-3 xl:grid-cols-4" : "lg:grid-cols-3 xl:grid-cols-5"}
      `}
    >
      {postsWithAds}
    </div>
  );
};

export default GuestPostView;