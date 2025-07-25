import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPublicPosts } from "../../store/guestSlice";
import GuestCardOfPost from "../Cards/GuestCardOfPost";
import InFeedAd from "../../Ads/InFeedAd";
import MultiplexAd from "../../Ads/MultiplexAd";

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

  const postsWithAds = [];

  posts.forEach((post, index) => {
    if (!post || !post._id || !post.slug) return;

    postsWithAds.push(<GuestCardOfPost key={post._id} {...post} />);

    // ⏺ Insert In-Feed Ad after every 6 posts
    if ((index + 1) % 6 === 0) {
      postsWithAds.push(
        <div key={`infeed-${index}`} className="col-span-full w-full">
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm overflow-hidden p-3">
            <InFeedAd postId={post._id} testMode={true} />
          </div>
        </div>
      );
    }

    // ⏺ Insert Multiplex Ad after every 10 posts
    if ((index + 1) % 10 === 0) {
      postsWithAds.push(
        <div key={`multiplex-${index}`} className="col-span-full w-full">
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-md p-2 sm:p-3 md:p-4">
            <MultiplexAd postId={post._id} testMode={true} />
          </div>
        </div>
      );
    }
  });

  return (
    <div
      className={`grid gap-4 py-6 w-full px-4
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
      {postsWithAds}
    </div>
  );
};

export default GuestPostView;
