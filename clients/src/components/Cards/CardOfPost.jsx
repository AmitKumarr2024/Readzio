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
import PlaylistButton from "../Playlist/PlaylistButton";

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
  // 🔍 DEBUG: Log all incoming props
  console.log("🔍 CardOfPost rendered with props", {
    id,
    slug,
    title,
    thumbnail,
    createdAt,
    commentsCount,
    viewsCount,
    likesCount,
    bookmarksCount,
    shareCount,
    authorName: author?.name,
    authorId: author?._id,
    category,
    isPremium,
    postType,
    readTime,
    loading,
    tags,
  });

  const dispatch = useDispatch();
  const {
    plans = [],
    isSubscribed = {},
    loading: subscriptionLoading,
  } = useSelector((state) => state.subscription || {});
  const currentUser = useSelector((state) => state.auth.user);

  // 🔍 DEBUG: Log Redux subscription state
  console.log("🔍 Subscription Redux state", {
    plansLength: plans.length,
    isSubscribedKeys: Object.keys(isSubscribed),
    subscriptionLoading,
    currentUserId: currentUser?._id,
  });

  const authorId = author?._id || "";
  const isPostPremium = isPremium;
  const isSubscribedToAuthor = isSubscribed[authorId];

  // 🔍 DEBUG: Log derived values
  console.log("🔍 Derived values", {
    authorId,
    isPostPremium,
    isSubscribedToAuthor,
    isOwnPost: authorId === currentUser?._id,
  });

  // Debounced fetch for subscription plans
  const debouncedFetchPlans = useMemo(
    () =>
      debounce((authorId) => {
        console.log("🔍 Debounced fetch triggered for authorId:", authorId);
        if (authorId && !subscriptionLoading) {
          dispatch(fetchSubscriptionPlansByAuthor(authorId));
        }
      }, 1000),
    [dispatch, subscriptionLoading]
  );

  useEffect(() => {
    console.log("🔍 useEffect for subscription plans - authorId:", authorId);
    if (authorId) {
      debouncedFetchPlans(authorId);
    }
    return () => {
      console.log("🔍 Cleaning up debounced fetch");
      debouncedFetchPlans.cancel();
    };
  }, [authorId, debouncedFetchPlans]);

  if (loading) {
    console.log("🔍 Rendering loading skeleton");
    return (
      <div className="group relative w-full flex flex-col h-full bg-white dark:bg-slate-900 p-2 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(59,130,246,0.15)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:border-transparent">
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

  console.log("🔍 Rendering full card (not loading)");

  const formattedDate = new Date(createdAt || new Date()).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );

  console.log("🔍 Formatted date:", formattedDate);

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
  console.log("🔍 Post type config:", postTypeConfig);

  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const postData = {
    _id: id,
    slug,
    thumbnail,
    title,
    author,
    category,
    createdAt,
    postType,
    isPremium,
    tags,
  };

  console.log("🔍 Final render - about to return JSX");

  return (
    <div
      className="group relative w-full flex flex-col h-full bg-white dark:bg-slate-900 p-2 rounded-[2rem] transition-all duration-500 hover:shadow-[0_20px_50px_rgba(59,130,246,0.15)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:border-transparent"
      onMouseEnter={() => console.log("🖱️ Mouse ENTER outer card")}
      onMouseLeave={() => console.log("🖱️ Mouse LEAVE outer card")}
      onClick={() => console.log("🖱️ Click bubbled to outer card")}
      onMouseDown={() => console.log("🖱️ MouseDown on outer card")}
      onMouseUp={() => console.log("🖱️ MouseUp on outer card")}
    >
      {/* FIXED: Border animation - now behind everything with -z-10 */}
      <div className="absolute -inset-[1px] rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden pointer-events-none -z-10">
        <div className="absolute inset-[-200%] bg-[conic-gradient(from_0deg,transparent_20%,#3b82f6_40%,#a855f7_60%,transparent_80%)] animate-border-rotate" />
      </div>

      {/* FIXED: Premium glow - now behind everything with -z-10 */}
      {isPostPremium && (
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-yellow-300/20 to-yellow-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] blur-xl pointer-events-none -z-10" />
      )}

      {/* FIXED: Main clickable Link - now with z-[1] for proper stacking */}
      <Link
        to={`/post/${slug}`}
        className="relative z-[1] flex-1 flex flex-col overflow-hidden rounded-[2rem]"
        onClick={() =>
          console.log("🔗 MAIN LINK CLICKED – navigation should trigger")
        }
        onMouseEnter={() => console.log("🖱️ Mouse ENTER main Link area")}
        onMouseLeave={() => console.log("🖱️ Mouse LEAVE main Link area")}
        onMouseDown={() => console.log("🖱️ MouseDown on main Link")}
        onMouseUp={() => console.log("🖱️ MouseUp on main Link")}
      >
        {/* Image Section */}
        <div
          className="relative rounded-[1rem] overflow-hidden"
          onClick={() => console.log("🖱️ Click on image container")}
        >
          <div className="aspect-video w-full relative">
            <img
              src={
                thumbnail ||
                "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&q=80"
              }
              alt={title || "Post"}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onClick={() => console.log("🖱️ Click directly on <img>")}
              onMouseDown={() => console.log("🖱️ MouseDown on <img>")}
              onMouseUp={() => console.log("🖱️ MouseUp on <img>")}
              onMouseEnter={() => console.log("🖱️ Mouse ENTER <img>")}
            />

            {/* Gradient overlay - decorative, non-interactive */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 pointer-events-none" />

            {/* Top row badges - all decorative */}
            <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
              {isPostPremium && (
                <span className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black text-xs font-bold rounded-full shadow-lg backdrop-blur-sm">
                  <Crown className="w-3 h-3" />
                  Premium
                </span>
              )}

              {readTime && (
                <span className="flex items-center gap-1 px-3 py-1.5 bg-black/70 text-white text-xs font-medium rounded-full backdrop-blur-sm ml-auto">
                  <Clock className="w-3 h-3" />
                  {readTime}
                </span>
              )}
            </div>

            {/* Bottom row badges and playlist button */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
              {/* Left side badges - decorative */}
              <div className="flex items-center gap-2 pointer-events-none">
                {postType && (
                  <span
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full text-white ${
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

                {isSubscribedToAuthor && authorId !== currentUser?._id && (
                  <span className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-full shadow-lg">
                    <Sparkles className="w-3 h-3" />
                    Subscribed
                  </span>
                )}
              </div>

              {/* FIXED: Playlist Button - interactive with highest z-index */}
              <div
                className="pointer-events-auto relative z-20"
                onClick={(e) => {
                  console.log(
                    "🎵 Playlist container clicked – stopping propagation"
                  );
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onMouseEnter={() =>
                  console.log("🖱️ Mouse ENTER playlist button area")
                }
                onMouseDown={() => console.log("🖱️ MouseDown on playlist area")}
              >
                <PlaylistButton
                  postId={id}
                  post={postData}
                  variant="icon"
                  className="pointer-events-auto"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4 flex flex-col gap-4 min-h-[200px]">
          <h3
            className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 line-clamp-2 leading-relaxed"
            onClick={() => console.log("🖱️ Click on title <h3>")}
            onMouseEnter={() => console.log("🖱️ Mouse ENTER title")}
          >
            {title || "Untitled"}
          </h3>

          <div
            className="flex items-center justify-between text-sm"
            onClick={() => console.log("🖱️ Click on author/category section")}
          >
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
                    if (category?.name) return category.name;
                    if (Array.isArray(categoryMap) && category?._id) {
                      const matched = categoryMap.find(
                        (c) => c._id === category._id
                      );
                      if (matched) return matched.name;
                    }
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

          <div
            className="flex items-center justify-between"
            onClick={() => console.log("🖱️ Click on stats section")}
          >
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

          {tags?.length > 0 && (
            <div
              className="flex flex-wrap gap-2"
              onClick={() => console.log("🖱️ Click on tags section")}
            >
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
      </Link>
    </div>
  );
};

export default CardOfPost;
