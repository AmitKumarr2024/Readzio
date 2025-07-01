import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { MessageCircle, Eye, Heart } from "lucide-react";
import TimeAgo from "../../Utils/TimeAgo";
import { fetchSubscriptionPlansByAuthor } from "../../store/subscriptionSlice";
import Skeleton from "../ui/Skeleton";
import { getSinglePost } from "../../store/postSlice";
import { formatDuration, intervalToDuration } from "date-fns";

// Utility to extract plain text from HTML
const getPlainTextSnippet = (html, wordCount = 15) => {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  const text = tempDiv.textContent || tempDiv.innerText || "";
  return text.split(" ").slice(0, wordCount).join(" ") + "...";
};

const CardOfPost = ({
  id,
  slug,
  imageUrl,
  title,
  createdAt,
  commentsCount,
  viewsCount,
  likesCount = 0,
  author = { name: "John Doe", org: "TechPulse" },
  previewHTML = "<p>No preview available</p>",
  thumbnail,
  category,
  isSubscriberOnly = false,
  loading = false,
  timeSpent = 0,
}) => {
  const dispatch = useDispatch();
  const { plans, isSubscribed, subscriptionLoading } = useSelector(
    (state) => state.subscription
  );
  const { currentPost, loading: postLoading } = useSelector(
    (state) => state.post
  );
  const currentUser = useSelector((state) => state.auth.user);
  const categories = useSelector((state) => state.categories.categories);

  const categoryName =
    categories.find((cat) => cat._id === category)?.name || "Uncategorized";

  const authorId = author?._id || author?.id;
  const restrictedPostIds = plans?.flatMap((plan) => plan.postIds || []) || [];
  const isPostRestricted = isSubscriberOnly || restrictedPostIds.includes(id);
  const isSubscribedToAuthor = isSubscribed[authorId];

  useEffect(() => {
    if (authorId && !loading && !postLoading) {
      dispatch(fetchSubscriptionPlansByAuthor(authorId));
    }
    if (id && !loading && !currentPost?.id === id) {
      dispatch(getSinglePost(slug));
    }
  }, [dispatch, authorId, id, loading, postLoading, currentPost]);

  const fallbackImage = "https://placehold.co/150x100?text=Ad+Failed";
  const preview = getPlainTextSnippet(previewHTML, 15);

  if (loading || postLoading) {
    return (
      <div className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark shadow-lg border border-background-light">
        <div className="relative">
          <Skeleton
            width="w-full"
            height="aspect-[16/9]"
            rounded="rounded-t-2xl"
            className="bg-sub-text-light dark:bg-sub-text-dark "
          />
          <Skeleton
            width="w-16"
            height="h-6"
            rounded="rounded-full"
            className="absolute top-2 right-2 shadow-sm bg-background-light"
          />
        </div>
        <div className="p-3 sm:p-4 flex flex-col gap-2 sm:gap-3">
          <div className="flex justify-between items-center">
            <Skeleton
              width="w-16"
              height="h-2 sm:h-3"
              rounded="rounded-sm"
              className="bg-sub-text-light dark:bg-sub-text-dark"
            />
            <Skeleton
              width="w-20 sm:w-24"
              height="h-2 sm:h-3"
              rounded="rounded-sm"
              className="bg-sub-text-light dark:bg-sub-text-dark"
            />
          </div>
          <Skeleton
            width="w-4/5"
            height="h-6 sm:h-7"
            rounded="rounded-md"
            className="bg-sub-text-light dark:bg-sub-text-dark"
          />
          <Skeleton
            width="w-full"
            height="h-2 sm:h-3"
            rounded="sm"
            className="bg-sub-text-light dark:bg-sub-text-dark"
          />
          <Skeleton
            width="w-3/4"
            height="h-2 sm:h-3"
            rounded="sm"
            className="bg-sub-text-light dark:bg-sub-text-dark"
          />
          <div className="flex gap-1 sm:gap-2">
            <Skeleton
              width="w-16 sm:w-20"
              height="h-4 sm:h-5"
              rounded="rounded-full"
              className="bg-sub-text-light dark:bg-sub-text-dark"
            />
            <Skeleton
              width="w-12 sm:w-16"
              height="h-4 sm:h-5"
              rounded="rounded-full"
              className="bg-sub-text-light dark:bg-sub-text-dark"
            />
          </div>
          <div className="flex items-center justify-between mt-4 sm:mt-2">
            <div className="flex gap-2 sm:gap-3">
              <Skeleton
                width="w-8 sm:w-12"
                height="h-2 sm:h-3"
                rounded="rounded-sm"
                className="bg-sub-text-light dark:bg-sub-text-dark"
              />
              <Skeleton
                width="w-8 sm:w-12"
                height="h-2 sm:h-3"
                rounded="rounded-sm"
                className="bg-sub-text-light dark:bg-sub-text-dark"
              />
              <Skeleton
                width="w-8 sm:w-12"
                height="h-2 sm:h-3"
                rounded="rounded-sm"
                className="bg-sub-text-light dark:bg-sub-text-dark"
              />
            </div>
            <Skeleton
              width="w-12 sm:w-16"
              height="h-2 sm:h-3"
              rounded="sm"
              className="bg-sub-text-light dark:bg-sub-text-dark"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={`/post/${slug}`}
      className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto rounded-2xl overflow-hidden bg-background-light  dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-sm hover:shadow-lg border border-gray-300 hover:border-blue-300 transition-all duration-200 flex flex-col h-full"
    >
      <div className="relative w-full">
        <img
          className="w-full aspect-[16/9] object-cover rounded-t-2xl"
          src={thumbnail || imageUrl || fallbackImage}
          alt={title || "Post image"}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-t-2xl" />
        <span
          className={`absolute top-2 right-2 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-semibold shadow-sm ${
            isPostRestricted
              ? "bg-yellow-600 text-black"
              : "bg-green-500 text-white"
          }`}
        >
          {isPostRestricted ? "Paid" : "Free"}
        </span>
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-grow gap-2 sm:gap-3">
        <div className="flex justify-between items-center gap-2">
          <span className="text-xs sm:text-sm font-semibold text-blue-600 uppercase tracking-wide truncate">
            {categoryName}
          </span>
          <span className="text-xs sm:text-sm   text-text-main-light dark:text-text-main-dark truncate">
            {author?.name || "Anonymous"}
          </span>
        </div>

        <h3 className="text-base sm:text-lg lg:text-xl font-bold  text-text-main-light dark:text-text-main-dark hover:text-blue-600 line-clamp-2 transition-colors duration-200">
          {title}
        </h3>

        <div className="flex flex-wrap gap-1 sm:gap-2">
          {isSubscribedToAuthor &&
            currentUser &&
            authorId !== currentUser?._id && (
              <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-semibold bg-blue-100 text-blue-700">
                Subscribed
              </span>
            )}
          {author?.status && (
            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-semibold bg-gray-100 text-gray-700">
              {author.status}
            </span>
          )}
        </div>

        <div className="flex flex-col items-start  text-text-main-light dark:text-text-main-dark text-xs sm:text-sm mt-auto gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="group relative flex items-center gap-1 hover:text-blue-600 transition-colors">
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {commentsCount}
              <span className="absolute left-0 bottom-full mb-1 hidden group-hover:block text-xs text-white bg-gray-800 px-2 py-1 rounded">
                Comments
              </span>
            </span>
            <span className="group relative flex items-center gap-1 hover:text-blue-600 transition-colors">
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {viewsCount}
              <span className="absolute left-0 bottom-full mb-1 hidden group-hover:block text-xs text-white bg-gray-800 px-2 py-1 rounded">
                Views
              </span>
            </span>
            <span className="group relative flex items-center gap-1 hover:text-red-500 transition-colors">
              <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
              {likesCount}
              <span className="absolute left-0 bottom-full mb-1 hidden group-hover:block text-xs text-white bg-gray-800 px-2 py-1 rounded">
                Likes
              </span>
            </span>
          </div>
          <div className="flex flex-col items-start gap-1 sm:gap-2">
            <span className="text-xs sm:text-sm  text-text-main-light dark:text-text-main-dark">
              Time Spent:{" "}
              {timeSpent
                ? formatDuration(
                    intervalToDuration({ start: 0, end: timeSpent * 1000 }),
                    { format: ["minutes", "seconds"] }
                  )
                : "0 seconds"}
            </span>
            <span className="text-xs sm:text-sm  text-text-main-light dark:text-text-main-dark">
              Created: <TimeAgo date={createdAt} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CardOfPost;
