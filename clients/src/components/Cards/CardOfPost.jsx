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
  ArrowUpRight,
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
  isPremium,
  tags = [],
  readTime,
  loading = false,
  postType,
}) => {
  const dispatch = useDispatch();

  // Redux Selectors from original code
  const { isSubscribed = {}, loading: subscriptionLoading } = useSelector(
    (state) => state.subscription || {}
  );
  const currentUser = useSelector((state) => state.auth.user);

  const authorId = author?._id || "";
  const isPostPremium = isPremium;
  const isSubscribedToAuthor = isSubscribed[authorId];

  // Debounced fetch logic from original
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

  const getCategoryName = () => {
    if (category?.name) return category.name;
    if (Array.isArray(categoryMap) && category?._id) {
      const matched = categoryMap.find((c) => c._id === category._id);
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
  };

  // Loading State / Skeleton
  if (loading) {
    return (
      <div className="w-full max-w-sm mx-auto rounded-[2.5rem] p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl">
        <Skeleton className="w-full aspect-[4/3] rounded-[2rem] mb-4 bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="px-2">
          <Skeleton className="h-6 w-3/4 rounded-md mb-3 bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <Skeleton className="h-4 w-1/2 rounded-md mb-6 bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="flex justify-between items-center mt-4">
            <Skeleton className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <Skeleton className="h-4 w-24 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Formatting Logic
  const formattedDate = new Date(createdAt || new Date()).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "short", day: "numeric" }
  );

  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Data for PlaylistButton
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

  return (
    <div className="group relative w-full flex flex-col h-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-3 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(59,130,246,0.15)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-slate-100 dark:border-slate-800/50 hover:border-transparent">
      {/* 1. CSS LOOP ANIMATION BORDER (Visible on Hover) */}
      <div className="absolute inset-0 rounded-[2.5rem] p-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-[-200%] bg-[conic-gradient(from_0deg,transparent_20%,#3b82f6_40%,#a855f7_60%,transparent_80%)] animate-border-rotate" />
        <div className="absolute inset-[2px] bg-white dark:bg-slate-900 rounded-[calc(2.5rem-2px)]" />
      </div>

      {/* 2. MEDIA SECTION */}
      <div className="relative z-10 aspect-[4/3] w-full overflow-hidden rounded-[2rem] bg-slate-100 dark:bg-slate-800">
        <img
          src={
            thumbnail ||
            "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&q=80"
          }
          alt={title}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          loading="lazy"
        />

        {/* Glassmorphism Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Floating Badges (Top) */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {isPostPremium && (
            <div className="flex items-center gap-1.5 bg-yellow-400 text-slate-900 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg animate-float">
              <Crown className="w-3.5 h-3.5" />
              Premium
            </div>
          )}
          {postType && (
            <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase">
              {postType}
            </div>
          )}
        </div>

        {/* Action Buttons (Bottom - Slide up on Hover) */}
        <div className="absolute bottom-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-2">
          <PlaylistButton
            postId={id}
            post={postData}
            variant="icon"
            className="bg-white/90 dark:bg-slate-800/90 p-2.5 rounded-xl shadow-xl hover:scale-110 transition-transform"
          />
          <Link
            to={`/post/${slug}`}
            className="bg-blue-600 text-white p-2.5 rounded-xl shadow-xl hover:bg-blue-700 hover:scale-110 transition-all"
          >
            <ArrowUpRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* 3. CONTENT SECTION */}
      <div className="relative z-10 p-5 flex flex-col flex-1">
        {/* Meta Info */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
            {getCategoryName()}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {readTime || "5 min"}
          </span>
        </div>

        {/* Title */}
        <Link to={`/post/${slug}`}>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-[1.3] mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
            {title || "Untitled Post"}
          </h3>
        </Link>

        {/* Engagement Stats Grid */}
        <div className="grid grid-cols-4 gap-1 mb-6 border-y border-slate-50 dark:border-slate-800/50 py-4">
          <div className="flex flex-col items-center group/stat">
            <Heart className="w-4 h-4 text-slate-400 group-hover/stat:text-red-500 transition-colors" />
            <span className="text-[10px] mt-1.5 font-black text-slate-600 dark:text-slate-400">
              {formatCount(likesCount)}
            </span>
          </div>
          <div className="flex flex-col items-center border-x border-slate-100 dark:border-slate-800/50 group/stat">
            <MessageCircle className="w-4 h-4 text-slate-400 group-hover/stat:text-blue-500 transition-colors" />
            <span className="text-[10px] mt-1.5 font-black text-slate-600 dark:text-slate-400">
              {formatCount(commentsCount)}
            </span>
          </div>
          <div className="flex flex-col items-center group/stat">
            <Eye className="w-4 h-4 text-slate-400 group-hover/stat:text-emerald-500 transition-colors" />
            <span className="text-[10px] mt-1.5 font-black text-slate-600 dark:text-slate-400">
              {formatCount(viewsCount)}
            </span>
          </div>
          <div className="flex flex-col items-center border-l border-slate-100 dark:border-slate-800/50 group/stat">
            <Bookmark className="w-4 h-4 text-slate-400 group-hover/stat:text-yellow-500 transition-colors" />
            <span className="text-[10px] mt-1.5 font-black text-slate-600 dark:text-slate-400">
              {formatCount(bookmarksCount)}
            </span>
          </div>
        </div>

        {/* 4. FOOTER (Author & Tags) */}
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm border-2 border-white dark:border-slate-800 shadow-lg">
                {author.name?.charAt(0).toUpperCase()}
              </div>
              {isSubscribedToAuthor && (
                <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-1 border-2 border-white dark:border-slate-900 shadow-sm animate-pulse">
                  <Sparkles className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                {author.name}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Tags (Mobile Responsive: Hidden on very small screens) */}
          <div className="hidden sm:flex -space-x-1.5">
            {tags.slice(0, 2).map((tag, i) => (
              <div
                key={i}
                className="px-2 py-1 rounded-lg text-[9px] font-black bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700"
              >
                #{tag.toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Premium Glow Effect (Background layer) */}
      {isPostPremium && (
        <div className="absolute -z-10 inset-0 bg-yellow-400/10 blur-[60px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      )}
    </div>
  );
};

export default CardOfPost;

// old code commented out below

// import React, { useEffect, useMemo } from "react";
// import { Link } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
// import { debounce } from "lodash";
// import {
//   MessageCircle,
//   Eye,
//   Heart,
//   Bookmark,
//   Share2,
//   Clock,
//   Crown,
//   Sparkles,
// } from "lucide-react";
// import { fetchSubscriptionPlansByAuthor } from "../../store/subscriptionSlice";
// import Skeleton from "@/components/Ui/Skeleton";
// import PlaylistButton from "../Playlist/PlaylistButton";

// const CardOfPost = ({
//   _id: id,
//   slug,
//   thumbnail,
//   title,
//   createdAt,
//   commentsCount = 0,
//   viewsCount = 0,
//   likesCount = 0,
//   bookmarksCount = 0,
//   shareCount = 0,
//   author = { name: "Anonymous", _id: "" },
//   category = { _id: "" },
//   categoryMap = {},
//   isSubscriberOnly = false,
//   timeSpent = 0,
//   loading = false,
//   postType,
//   isPremium,
//   tags = [],
//   readTime,
// }) => {
//   const dispatch = useDispatch();
//   const {
//     plans = [],
//     isSubscribed = {},
//     loading: subscriptionLoading,
//   } = useSelector((state) => state.subscription || {});
//   const currentUser = useSelector((state) => state.auth.user);

//   const authorId = author?._id || "";
//   const isPostPremium = isPremium;
//   const isSubscribedToAuthor = isSubscribed[authorId];

//   // Debounced fetch for subscription plans
//   const debouncedFetchPlans = useMemo(
//     () =>
//       debounce((authorId) => {
//         if (authorId && !subscriptionLoading) {
//           dispatch(fetchSubscriptionPlansByAuthor(authorId));
//         }
//       }, 1000),
//     [dispatch, subscriptionLoading]
//   );

//   useEffect(() => {
//     if (authorId) {
//       debouncedFetchPlans(authorId);
//     }
//     return () => debouncedFetchPlans.cancel();
//   }, [authorId, debouncedFetchPlans]);

//   if (loading) {
//     return (
//       <div className="group relative bg-white dark:bg-slate-900 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-slate-800">
//         <div className="relative">
//           <Skeleton className="w-full h-56 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-pulse" />
//         </div>
//         <div className="p-6 space-y-4">
//           <Skeleton className="h-6 w-4/5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-pulse rounded-lg" />
//           <Skeleton className="h-4 w-3/5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-pulse rounded-lg" />
//           <div className="flex gap-3">
//             {[...Array(4)].map((_, i) => (
//               <Skeleton
//                 key={i}
//                 className="h-4 w-12 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-pulse rounded-full"
//               />
//             ))}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   const formattedDate = new Date(createdAt || new Date()).toLocaleDateString(
//     "en-US",
//     {
//       year: "numeric",
//       month: "short",
//       day: "numeric",
//     }
//   );

//   const getPostTypeConfig = (type) => {
//     const configs = {
//       blog: {
//         bg: "bg-gradient-to-r from-purple-500 to-purple-600",
//         icon: "📝",
//       },
//       article: {
//         bg: "bg-gradient-to-r from-emerald-500 to-emerald-600",
//         icon: "📄",
//       },
//       news: { bg: "bg-gradient-to-r from-red-500 to-red-600", icon: "📰" },
//       tutorial: {
//         bg: "bg-gradient-to-r from-blue-500 to-blue-600",
//         icon: "🎓",
//       },
//     };
//     return (
//       configs[type?.toLowerCase()] || {
//         bg: "bg-gradient-to-r from-gray-500 to-gray-600",
//         icon: "📋",
//       }
//     );
//   };

//   const postTypeConfig = getPostTypeConfig(postType);

//   const formatCount = (count) => {
//     if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
//     if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
//     return count.toString();
//   };

//   // Collect all post data for passing to PlaylistButton
//   const postData = {
//     _id: id,
//     slug,
//     thumbnail,
//     title,
//     author,
//     category,
//     createdAt,
//     postType,
//     isPremium,
//     tags,
//   };

//   return (
//     <div className="group relative bg-white dark:bg-slate-900 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-slate-700 transform hover:-translate-y-1 h-full flex flex-col">
//       {/* Premium Glow Effect */}
//       {isPostPremium && (
//         <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-yellow-300/20 to-yellow-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl z-[1]" />
//       )}

//       {/* Link wrapper for image and content */}
//       <Link to={`/post/${slug}`} className="flex-1 flex flex-col">
//         {/* Image Section */}
//         <div className="relative overflow-hidden">
//           <div className="aspect-video w-full relative">
//             <img
//               src={
//                 thumbnail ||
//                 "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&q=80"
//               }
//               alt={title || "Post"}
//               className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
//               loading="lazy"
//             />
//             {/* Dark gradient overlay */}
//             <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />

//             {/* Premium Badge (Top-Left) */}
//             {isPostPremium && (
//               <span className="absolute top-0 left-0 flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black text-xs font-bold rounded-full shadow-lg backdrop-blur-sm animate-pulse">
//                 <Crown className="w-3 h-3" />
//                 Premium
//               </span>
//             )}

//             {/* Read Time (Top-Right) */}
//             {readTime && (
//               <span className="absolute top-0 right-0 flex items-center gap-1 px-3 py-1.5 bg-black/70 text-white text-xs font-medium rounded-full backdrop-blur-sm">
//                 <Clock className="w-3 h-3" />
//                 {readTime}
//               </span>
//             )}

//             {/* Post Type Badge (Bottom-Left) */}
//             {postType && (
//               <span
//                 className={`absolute bottom-1 left-1 flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full text-white animate-pulse ${
//                   postType.toLowerCase() === "blog"
//                     ? "bg-indigo-600"
//                     : postType.toLowerCase() === "article"
//                     ? "bg-emerald-600"
//                     : postType.toLowerCase() === "news"
//                     ? "bg-red-600"
//                     : "bg-gray-500"
//                 }`}
//               >
//                 {postType}
//               </span>
//             )}

//             {/* Subscribed Badge (Bottom-Right) */}
//             {isSubscribedToAuthor && authorId !== currentUser?._id && (
//               <span className="absolute bottom-1 right-1 flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-full shadow-lg animate-pulse">
//                 <Sparkles className="w-3 h-3" />
//                 Subscribed
//               </span>
//             )}

//             {/* Playlist Button - Absolute bottom-right */}
//             <PlaylistButton
//               postId={id}
//               post={postData}
//               variant="icon"
//               className="absolute bottom-2 right-2 z-10"
//             />
//           </div>
//         </div>

//         {/* Content Section */}
//         <div className="p-6 flex flex-col gap-4 flex-1">
//           {/* Title */}
//           <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 line-clamp-2 leading-relaxed">
//             {title || "Untitled"}
//           </h3>

//           {/* Author & Category */}
//           <div className="flex items-center justify-between text-sm">
//             <div className="flex items-center gap-2">
//               <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
//                 {author.name?.charAt(0)?.toUpperCase() || "A"}
//               </div>
//               <div className="flex flex-col">
//                 <span className="font-semibold text-gray-900 dark:text-white">
//                   {author.name || "Anonymous"}
//                 </span>
//                 <span className="text-xs text-gray-500 dark:text-gray-400">
//                   {(() => {
//                     // If category object has name directly
//                     if (category?.name) return category.name;

//                     // If categoryMap is array, find by matching _id
//                     if (Array.isArray(categoryMap) && category?._id) {
//                       const matched = categoryMap.find(
//                         (c) => c._id === category._id
//                       );
//                       if (matched) return matched.name;
//                     }

//                     // If categoryMap is object (fallback)
//                     if (!Array.isArray(categoryMap)) {
//                       return (
//                         categoryMap[category?._id] ||
//                         categoryMap[category] ||
//                         (typeof category === "string" ? category : "General")
//                       );
//                     }

//                     return "General";
//                   })()}
//                 </span>
//               </div>
//             </div>
//             <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
//               {formattedDate}
//             </span>
//           </div>

//           {/* Stats */}
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-4">
//               <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors">
//                 <Heart className="w-4 h-4" />
//                 {formatCount(likesCount)}
//               </span>
//               <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors">
//                 <MessageCircle className="w-4 h-4" />
//                 {formatCount(commentsCount)}
//               </span>
//               <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-green-500 transition-colors">
//                 <Eye className="w-4 h-4" />
//                 {formatCount(viewsCount)}
//               </span>
//             </div>

//             <div className="flex items-center gap-2">
//               <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-yellow-500 transition-colors">
//                 <Bookmark className="w-4 h-4" />
//                 {formatCount(bookmarksCount)}
//               </span>
//               <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-purple-500 transition-colors">
//                 <Share2 className="w-4 h-4" />
//                 {formatCount(shareCount)}
//               </span>
//             </div>
//           </div>

//           {/* Tags */}
//           {tags?.length > 0 && (
//             <div className="flex flex-wrap gap-2">
//               {tags.slice(0, 2).map((tag, index) => (
//                 <span
//                   key={tag}
//                   className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 hover:scale-105 cursor-pointer ${
//                     index === 0
//                       ? "bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 text-blue-700 dark:text-blue-300 hover:from-blue-200 hover:to-blue-300"
//                       : index === 1
//                       ? "bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 text-purple-700 dark:text-purple-300 hover:from-purple-200 hover:to-purple-300"
//                       : "bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 text-green-700 dark:text-green-300 hover:from-green-200 hover:to-green-300"
//                   }`}
//                 >
//                   #{tag}
//                 </span>
//               ))}
//               {tags.length > 2 && (
//                 <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer">
//                   +{tags.length - 2} more
//                 </span>
//               )}
//             </div>
//           )}
//         </div>
//       </Link>

//       {/* Hover Effect Border */}
//       <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-15 transition-opacity duration-300 pointer-events-none bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 p-[2px] z-[2]">
//         <div className="w-full h-full rounded-2xl bg-transparent" />
//       </div>
//     </div>
//   );
// };

// export default CardOfPost;
