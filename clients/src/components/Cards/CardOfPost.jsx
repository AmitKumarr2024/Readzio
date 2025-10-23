import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { debounce } from "lodash";
import {
  MessageCircle,
  Eye,
  Heart,
  Bookmark,
  Share2,
  Clock,
  Crown,
  Sparkles,
} from "lucide-react";
import { fetchSubscriptionPlansByAuthor } from "../../store/subscriptionSlice";
import Skeleton from "@/components/Ui/Skeleton";

const CardOfPost = ({
  _id: id,
  slug,
  thumbnail,
  title,
  createdAt,
  commentsCount = 0,
  viewsCount = 0,
  likesCount = 0,
  bookmarksCount = 0,
  shareCount = 0,
  author = { name: "Anonymous", _id: "" },
  category = { _id: "" },
  categoryMap = {},
  isSubscriberOnly = false,
  timeSpent = 0,
  loading = false,
  postType,
  isPremium,
  tags = [],
  readTime,
}) => {
  const dispatch = useDispatch();
  const {
    plans = [],
    isSubscribed = {},
    loading: subscriptionLoading,
  } = useSelector((state) => state.subscription || {});
  const currentUser = useSelector((state) => state.auth.user);

  const authorId = author?._id || "";
  const isPostPremium = isPremium;
  const isSubscribedToAuthor = isSubscribed[authorId];

  // Debounced fetch for subscription plans
  const debouncedFetchPlans = useMemo(
    () =>
      debounce((authorId) => {
        if (authorId && !subscriptionLoading) {
          dispatch(fetchSubscriptionPlansByAuthor(authorId));
        }
      }, 1000),
    [dispatch, subscriptionLoading]
  );

  useEffect(() => {
    if (authorId) {
      debouncedFetchPlans(authorId);
    }
    return () => debouncedFetchPlans.cancel();
  }, [authorId, debouncedFetchPlans]);

  if (loading) {
    return (
      <div className="group relative bg-white dark:bg-slate-900 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-slate-800">
        <div className="relative">
          <Skeleton className="w-full h-56 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-pulse" />
        </div>
        <div className="p-6 space-y-4">
          <Skeleton className="h-6 w-4/5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-pulse rounded-lg" />
          <Skeleton className="h-4 w-3/5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-pulse rounded-lg" />
          <div className="flex gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-4 w-12 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-pulse rounded-full"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(createdAt || new Date()).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );

  const getPostTypeConfig = (type) => {
    const configs = {
      blog: {
        bg: "bg-gradient-to-r from-purple-500 to-purple-600",
        icon: "📝",
      },
      article: {
        bg: "bg-gradient-to-r from-emerald-500 to-emerald-600",
        icon: "📄",
      },
      news: { bg: "bg-gradient-to-r from-red-500 to-red-600", icon: "📰" },
      tutorial: {
        bg: "bg-gradient-to-r from-blue-500 to-blue-600",
        icon: "🎓",
      },
    };
    return (
      configs[type?.toLowerCase()] || {
        bg: "bg-gradient-to-r from-gray-500 to-gray-600",
        icon: "📋",
      }
    );
  };

  const postTypeConfig = getPostTypeConfig(postType);

  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <Link
      to={`/post/${slug}`}
      className="group relative bg-white dark:bg-slate-900 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-slate-700 transform hover:-translate-y-1 block h-full"
    >
      {/* Premium Glow Effect */}
      {isPostPremium && (
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-yellow-300/20 to-yellow-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl z-[1]" />
      )}

      {/* Image Section */}
      <div className="relative overflow-hidden">
        <div className="aspect-video w-full relative">
          <img
            src={
              thumbnail ||
              "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&q=80"
            }
            alt={title || "Post"}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />

          {/* Premium Badge (Top-Left) */}
          {isPostPremium && (
            <span className="absolute top-0 left-0 flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black text-xs font-bold rounded-full shadow-lg backdrop-blur-sm animate-pulse">
              <Crown className="w-3 h-3" />
              Premium
            </span>
          )}

          {/* Read Time (Top-Right) */}
          {readTime && (
            <span className="absolute top-0 right-0 flex items-center gap-1 px-3 py-1.5 bg-black/70 text-white text-xs font-medium rounded-full backdrop-blur-sm">
              <Clock className="w-3 h-3" />
              {readTime}
            </span>
          )}

          {/* Post Type Badge (Bottom-Left) */}
          {postType && (
            <span
              className={`absolute bottom-1 left-1 flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full text-white animate-pulse ${
                postType.toLowerCase() === "blog"
                  ? "bg-indigo-600"
                  : postType.toLowerCase() === "article"
                  ? "bg-emerald-600"
                  : postType.toLowerCase() === "news"
                  ? "bg-red-600"
                  : "bg-gray-500"
              }`}
            >
              {postType}
            </span>
          )}

          {/* Subscribed Badge (Bottom-Right) */}
          {isSubscribedToAuthor && authorId !== currentUser?._id && (
            <span className="absolute bottom-1 right-1 flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-full shadow-lg animate-pulse">
              <Sparkles className="w-3 h-3" />
              Subscribed
            </span>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col gap-4">
        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 line-clamp-2 leading-relaxed">
          {title || "Untitled"}
        </h3>

        {/* Author & Category */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
              {author.name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-900 dark:text-white">
                {author.name || "Anonymous"}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {(() => {
                  // If category object has name directly
                  if (category?.name) return category.name;

                  // If categoryMap is array, find by matching _id
                  if (Array.isArray(categoryMap) && category?._id) {
                    const matched = categoryMap.find(
                      (c) => c._id === category._id
                    );
                    if (matched) return matched.name;
                  }

                  // If categoryMap is object (fallback)
                  if (!Array.isArray(categoryMap)) {
                    return (
                      categoryMap[category?._id] ||
                      categoryMap[category] ||
                      (typeof category === "string" ? category : "General")
                    );
                  }

                  return "General";
                })()}
              </span>
            </div>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {formattedDate}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors">
              <Heart className="w-4 h-4" />
              {formatCount(likesCount)}
            </span>
            <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors">
              <MessageCircle className="w-4 h-4" />
              {formatCount(commentsCount)}
            </span>
            <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-green-500 transition-colors">
              <Eye className="w-4 h-4" />
              {formatCount(viewsCount)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-yellow-500 transition-colors">
              <Bookmark className="w-4 h-4" />
              {formatCount(bookmarksCount)}
            </span>
            <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-purple-500 transition-colors">
              <Share2 className="w-4 h-4" />
              {formatCount(shareCount)}
            </span>
          </div>
        </div>

        {/* Tags */}
        {tags?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 2).map((tag, index) => (
              <span
                key={tag}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 hover:scale-105 cursor-pointer ${
                  index === 0
                    ? "bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 text-blue-700 dark:text-blue-300 hover:from-blue-200 hover:to-blue-300"
                    : index === 1
                    ? "bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 text-purple-700 dark:text-purple-300 hover:from-purple-200 hover:to-purple-300"
                    : "bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 text-green-700 dark:text-green-300 hover:from-green-200 hover:to-green-300"
                }`}
              >
                #{tag}
              </span>
            ))}
            {tags.length > 2 && (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                +{tags.length - 2} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hover Effect Border */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-15 transition-opacity duration-300 pointer-events-none bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 p-[2px] z-[2]">
        <div className="w-full h-full rounded-2xl bg-transparent" />
      </div>
    </Link>
  );
};

export default CardOfPost;
