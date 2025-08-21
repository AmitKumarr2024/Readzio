import React, { useEffect, useRef } from "react";
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
    hasMore,
  } = useSelector((state) => state.guest || {});
  const observerRef = useRef();

  // Initial load
  useEffect(() => {
    const init = async () => {
      const guestId = localStorage.getItem("guestId");
      if (!guestId) {
        await dispatch(trackGuestVisit()).unwrap();
      }
      await dispatch(fetchPublicPosts({ page: 1, limit: 12 })).unwrap();
    };
    init();
  }, [dispatch]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          dispatch(fetchPublicPosts({ page: page + 1, limit: 12 }));
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) observer.observe(observerRef.current);

    return () => {
      if (observerRef.current) observer.unobserve(observerRef.current);
    };
  }, [dispatch, page, hasMore, loading]);

  return (
    <div className="container mx-auto px-4 py-8">
      <GuestLoginModal />
      <div className="grid gap-4 py-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {posts.map((post, index) => {
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
        })}

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

        {!loading && posts.length === 0 && (
          <div className="col-span-full text-center text-gray-400 py-8">
            No posts available
          </div>
        )}
      </div>

      {hasMore && posts.length > 0 && (
        <div ref={observerRef} className="h-10" />
      )}
    </div>
  );
};

export default GuestPostView;
