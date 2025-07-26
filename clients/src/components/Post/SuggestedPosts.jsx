import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { fetchSuggestedPosts } from "../../store/suggestedPostsSlice";
import toast from "react-hot-toast";
import TimeAgo from "../../Utils/TimeAgo";
import Skeleton from "@/components/Ui/Skeleton";
import adsConfig from "../../Utils/adsConfig";
import InFeedAd from "../../Ads/InFeedAd";
import MultiplexAd from "../../Ads/MultiplexAd";
import HorizontalBannerAd from "../../Ads/HorizontalBannerAd";

const SuggestedPosts = () => {
  const dispatch = useDispatch();
  const hasFetched = useRef(false);
  const {
    posts = [],
    status,
    error,
  } = useSelector((state) => state.suggestedPosts || {});

  useEffect(() => {
    if (status === "idle" && !hasFetched.current) {
      hasFetched.current = true;
      if (process.env.NODE_ENV === "production") {
        // console.log("[SuggestedPosts] Fetching suggested posts, limit: 6");
      }
      dispatch(fetchSuggestedPosts({ limit: 6 }));
    }
  }, [dispatch, status]);

  useEffect(() => {
    if (status === "failed" && error) {
      if (process.env.NODE_ENV === "production") {
        console.error("[SuggestedPosts] Fetch error:", error);
      }
      toast.error(error || "Failed to load suggested posts");
    }
  }, [status, error]);

  const displayedPosts = posts.slice(0, 6);
  const adPositions = displayedPosts.length >= 4 ? [2, 4] : []; // Ads after 2nd and 4th posts
  const multiplexAdPositions = displayedPosts.length >= 6 ? [6] : []; // Multiplex ad after last post
  const fallbackImage = "https://placehold.co/600x400?text=No+Image";

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center">
        Explore More Stories
      </h2>

      {status === "loading" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-full mx-auto">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-md shadow-md overflow-hidden"
            >
              <Skeleton
                width="w-full"
                height="h-48"
                className="rounded-t-md bg-gray-200 dark:bg-gray-700"
              />
              <div className="p-4 space-y-2">
                <Skeleton
                  width="w-3/4"
                  height="h-6"
                  className="bg-gray-200 dark:bg-gray-700"
                />
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td>
                        <Skeleton className="h-4 w-24 bg-gray-200 dark:bg-gray-700" />
                      </td>
                      <td>
                        <Skeleton className="h-4 w-24 bg-gray-200 dark:bg-gray-700" />
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td>
                        <Skeleton className="h-4 w-12 bg-gray-200 dark:bg-gray-700" />
                      </td>
                      <td>
                        <Skeleton className="h-4 w-12 bg-gray-200 dark:bg-gray-700" />
                      </td>
                      <td>
                        <Skeleton className="h-4 w-12 bg-gray-200 dark:bg-gray-700" />
                      </td>
                      <td>
                        <Skeleton className="h-4 w-12 bg-gray-200 dark:bg-gray-700" />
                      </td>
                      <td>
                        <Skeleton className="h-4 w-12 bg-gray-200 dark:bg-gray-700" />
                      </td>
                    </tr>
                  </tbody>
                </table>
                <Skeleton
                  width="w-16"
                  height="h-4"
                  className="bg-gray-200 dark:bg-gray-700"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {status === "failed" && (
        <p className="text-lg text-center text-gray-900 dark:text-gray-100 bg-red-100 dark:bg-red-800 py-4 rounded-md max-w-2xl mx-auto shadow-md">
          {error || "Failed to load posts"}
        </p>
      )}

      {status === "succeeded" && displayedPosts.length === 0 && (
        <p className="text-lg text-center text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 py-4 rounded-md max-w-2xl mx-auto shadow-md">
          No suggested posts available.
        </p>
      )}

      {status === "succeeded" && displayedPosts.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-w-8xl mx-auto">
            {displayedPosts.map((post, index) => (
              <React.Fragment key={post._id || `post-${index}`}>
                <Link
                  to={`/post/${post.slug}`}
                  className="group bg-white dark:bg-gray-800 rounded-xs shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="relative">
                    <img
                      src={post.thumbnail || fallbackImage}
                      alt={post.title || "Post"}
                      className="w-full h-48 object-cover rounded-t-md transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        if (process.env.NODE_ENV === "production") {
                          console.warn(
                            `[SuggestedPosts] Thumbnail failed for post ${post._id}:`,
                            post.thumbnail
                          );
                        }
                        e.target.src = fallbackImage;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 mb-2">
                      {post.title || "Untitled"}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span>{post.author?.name || "Unknown"}</span>
                      <span className="text-gray-400">•</span>
                      <TimeAgo date={post.createdAt} />
                    </p>
                  </div>
                </Link>

                {adPositions.includes(index + 1) && (
                  <div className="w-full min-h-[250px] p-3 rounded-lg bg-white dark:bg-gray-800">
                    <InFeedAd postId={post._id} />
                  </div>
                )}
                {multiplexAdPositions.includes(index + 1) && (
                  <div className="col-span-full w-full border-t border-b border-gray-300 dark:border-gray-600 my-4">
                    <MultiplexAd postId={post._id} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="col-span-full w-full mt-6">
            <HorizontalBannerAd />
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(SuggestedPosts);
