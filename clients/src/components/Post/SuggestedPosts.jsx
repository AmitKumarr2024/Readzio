import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { fetchSuggestedPosts } from "../../store/suggestedPostsSlice";
import { toast } from "react-hot-toast";
import TimeAgo from "../../Utils/TimeAgo";
import Skeleton from "@/components/Ui/Skeleton";
import HorizontalBannerAd from "../../Ads/HorizontalBannerAd";
import SafeInFeedAd from "../../Ads/SafeInFeedAd";
import { Clock, User, TrendingUp } from "lucide-react";
import AdGuard from "../../Ads/adsGaurd/AdGuard";
import MultiplexAd from "../../Ads/MultiplexAd";

const SuggestedPosts = ({ postId, className }) => {
  const dispatch = useDispatch();
  const hasFetched = useRef(false);
  const lastPostId = useRef(null);
  const observerTarget = useRef(null);
  const [displayLimit, setDisplayLimit] = useState(12);

  const {
    posts = [],
    status,
    error,
  } = useSelector((state) => state.suggestedPosts || {});

  useEffect(() => {
    if (lastPostId.current !== postId) {
      hasFetched.current = false;
      lastPostId.current = postId;
      setDisplayLimit(12);
    }

    if (status === "idle" && !hasFetched.current) {
      hasFetched.current = true;

      dispatch(
        fetchSuggestedPosts({
          limit: 30,
          exclude: postId || "",
        })
      )
        .unwrap()
        .catch((error) => {
          console.error("[SuggestedPosts] Fetch error:", error);

          if (error.includes("Network") || error.includes("connection")) {
            toast.error("Network error. Please check your connection.");
          } else if (error.includes("404") || error.includes("not found")) {
            toast.error("Suggested posts service is temporarily unavailable.");
          } else {
            toast.error(
              "Failed to load suggested posts. Please try again later."
            );
          }
        });
    }
  }, [dispatch, status, postId]);

  // Infinite scroll logic
  const loadMore = useCallback(() => {
    if (displayLimit < posts.length) {
      setDisplayLimit((prev) => Math.min(prev + 12, posts.length));
    }
  }, [displayLimit, posts.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && status === "succeeded") {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMore, status]);

  const displayedPosts = posts.slice(0, displayLimit);
  const fallbackImage = "https://placehold.co/600x400?text=No+Image";

  const handleRetry = () => {
    hasFetched.current = false;
    dispatch({ type: "suggestedPosts/resetStatus" });
  };

  // Calculate ad positions - every 6 posts for in-feed, every 12 for banner
  const shouldShowAd = (index) => (index + 1) % 6 === 0;
  const shouldShowBannerAd = (index) => (index + 1) % 12 === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Discover More Stories
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Handpicked articles just for you
          </p>
        </div>

        {/* Loading State */}
        {status === "loading" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
              >
                <Skeleton
                  width="w-full"
                  height="h-56"
                  className="bg-gray-200 dark:bg-gray-700"
                />
                <div className="p-6 space-y-4">
                  <Skeleton
                    width="w-full"
                    height="h-6"
                    className="bg-gray-200 dark:bg-gray-700"
                  />
                  <Skeleton
                    width="w-3/4"
                    height="h-6"
                    className="bg-gray-200 dark:bg-gray-700"
                  />
                  <div className="flex gap-4 pt-2">
                    <Skeleton
                      width="w-20"
                      height="h-4"
                      className="bg-gray-200 dark:bg-gray-700"
                    />
                    <Skeleton
                      width="w-24"
                      height="h-4"
                      className="bg-gray-200 dark:bg-gray-700"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {status === "failed" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-10 h-10 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Unable to Load Posts
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{error}</p>
              </div>
              <button
                onClick={handleRetry}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {status === "succeeded" && displayedPosts.length === 0 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                No Posts Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Check back later for more content
              </p>
            </div>
          </div>
        )}

        {/* Posts Grid */}
        {status === "succeeded" && displayedPosts.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {displayedPosts.map((post, index) => (
                <React.Fragment key={post._id || `post-${index}`}>
                  {/* Post Card */}
                  <Link
                    to={`/post/${post.slug}`}
                    className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex flex-col"
                  >
                    <div className="relative overflow-hidden h-56">
                      <img
                        src={post.thumbnail || fallbackImage}
                        alt={post.title || "Post"}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          e.target.src = fallbackImage;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Floating badge */}
                      <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300">
                        New
                      </div>
                    </div>

                    <div className="p-6 flex flex-col flex-grow">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 line-clamp-2 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {post.title || "Untitled"}
                      </h3>

                      <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-medium">
                            <User className="w-4 h-4" />
                            <span>{post.author?.name || "Unknown"}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-500">
                            <Clock className="w-4 h-4" />
                            <TimeAgo date={post.createdAt} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* In-feed Ad Card - Same styling as posts */}
                  {shouldShowAd(index) && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden flex flex-col">
                      <div className="relative h-56 flex items-center justify-center p-4">
                        <div className="w-full h-full">
                          <SafeInFeedAd postId={post._id} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Banner Ad - Full width */}
                  {shouldShowBannerAd(index) && (
                    <AdGuard placement="multiplex">
                      <div className="col-span-full">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden p-6">
                          <div className="flex items-center justify-center min-h-[250px] rounded-xl overflow-hidden">
                            <MultiplexAd postId={post._id} />
                          </div>
                        </div>
                      </div>
                    </AdGuard>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Infinite Scroll Trigger */}
            {displayLimit < posts.length && (
              <div ref={observerTarget} className="flex justify-center py-12">
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <div
                    className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-2 h-2 bg-pink-600 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                  <span className="ml-2 font-medium">Loading more...</span>
                </div>
              </div>
            )}

            {/* End Message */}
            {displayLimit >= posts.length && posts.length > 0 && (
              <div className="text-center py-12">
                <div className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-6 py-3 rounded-full shadow-md">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="font-medium">You've reached the end</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(SuggestedPosts);
