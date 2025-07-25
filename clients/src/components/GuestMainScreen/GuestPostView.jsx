import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPublicPosts } from "../../store/guestSlice";
import GuestCardOfPost from "../Cards/GuestCardOfPost";
import GoogleAd from "../../Ads/GoogleAd";
import adsConfig from "../../Utils/adsConfig";

const GuestPostView = () => {
  const dispatch = useDispatch();
  const { posts = [], loading, error } = useSelector((state) => state.guest || {});
  const isSidebarOpen = useSelector((state) => state.postMeta?.isSidebarOpen || false);

  useEffect(() => {
    dispatch(fetchPublicPosts({ page: 1, limit: 12 }));
  }, [dispatch]);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading posts...</div>;
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
  const adFrequency = 5;

  posts.forEach((post, index) => {
    if (!post || !post._id || !post.slug) return;

    postsWithAds.push(<GuestCardOfPost key={post._id} {...post} />);

    if ((index + 1) % adFrequency === 0) {
      postsWithAds.push(
        <div key={`ad-${index}`} className="w-full col-span-full">
          <GoogleAd
            adSlot={adsConfig.card.slot}
            adFormat={adsConfig.card.format}
            postId={post._id}
            style={{ display: "block", width: "100%", height: "auto" }}
            className="my-4"
            testMode={true}
          />
        </div>
      );
    }
  });

  return (
    <div
      className={`grid gap-4 py-6 w-full px-8
        grid-cols-1 
        sm:grid-cols-2 
        md:grid-cols-3 
        ${
          isSidebarOpen
            ? "lg:grid-cols-3 xl:grid-cols-4"
            : "lg:grid-cols-3 xl:grid-cols-5"
        }`}
    >
      {postsWithAds}
    </div>
  );
};

export default GuestPostView;
