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
import { Link } from "react-router-dom";

const GuestLoginModal = ({ onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4 sm:px-6">
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
      <h2 className="text-xl font-semibold mb-4">Guest Limit Reached</h2>
      <p className="mb-4">
        You've reached the guest visit limit. Log in to continue exploring!
      </p>
      <div className="flex justify-end gap-4">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-500 hover:text-gray-700"
        >
          Close
        </button>
        <Link
          to="/login"
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Log In
        </Link>
      </div>
    </div>
  </div>
);

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
  const [showModal, setShowModal] = useState(false);
  const observerRef = useRef();

  useEffect(() => {
    const loadData = async () => {
      try {
        const guestId = localStorage.getItem("guestId");
        if (!guestId) {
          await dispatch(trackGuestVisit()).unwrap();
        }
        if (posts.length === 0) {
          await dispatch(fetchPublicPosts({ page: 1, limit: 12 })).unwrap();
        }
      } catch (err) {
        console.error("[GuestPostView] Error loading guest data:", err);
      }
    };
    loadData();
  }, [dispatch]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
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

  useEffect(() => {
    if (error === "Too many guest visits, please try again later") {
      const timer = setTimeout(() => setShowModal(true), 30000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Empty state
  if (!loading && (!Array.isArray(posts) || posts.length === 0)) {
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
      {showModal && <GuestLoginModal onClose={() => setShowModal(false)} />}
      {error && error !== "Too many guest visits, please try again later" && (
        <div className="text-center text-red-500 py-4">
          {error}
          <button
            onClick={() => dispatch(fetchPublicPosts({ page: 1, limit: 12 }))}
            className="ml-2 text-blue-500 underline"
          >
            Retry
          </button>
        </div>
      )}
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
        {postsWithAds}
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
      {hasMore && <div ref={observerRef} className="h-10" />}
      {!hasMore && posts.length > 0 && (
        <div className="text-center text-gray-400 py-4">
          No more posts to load
        </div>
      )}
    </div>
  );
};

export default GuestPostView;
