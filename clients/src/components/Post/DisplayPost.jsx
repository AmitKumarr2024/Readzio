// DisplayPost.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { useDispatch, useSelector } from "react-redux";
import {
  getSinglePost,
  startReading,
  stopReading,
  submitReadingTime,
} from "../../store/postSlice";
import { fetchBookmarkAndLikeStatus } from "../../store/Post interactions";
import { fetchSuggestedPosts } from "../../store/suggestedPostsSlice";
import { fetchCategories } from "../../store/categorySlice";
import { fetchSubscriptionPlansByAuthor } from "../../store/subscriptionSlice";
import BlockRenderer from "../PostFeature/BlockRenderer";
import LikeButton from "./LikeButton";
import ShareButton from "./ShareButton";
import BookmarkButton from "./BookmarkButton";
import CommentBox from "./CommentBox";
import TimeAgo from "../../Utils/TimeAgo";
import DeleteModal from "./DeleteModal";
import TotalView from "./TotalView";
import UserCardWrapper from "../Cards/usercard/UserCardWrapper";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";
import ErrorBoundary from "./ErrorBoundary";
import PostErrorHandler from "./PostErrorHandler";
import Skeleton from "../ui/Skeleton";
import PostOptionsDropdown from "./PostOptionsDropdown";
import AdCard from "../../Utils/AdCard";
import toast, { Toaster } from "react-hot-toast";
import { selectPostViews } from "../../Utils/postSelectors";

const SuggestedPosts = () => {
  const dispatch = useDispatch();
  const { posts, status, error } = useSelector((state) => state.suggestedPosts);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchSuggestedPosts({ limit: 20 }));
    }
  }, [dispatch, status]);

  useEffect(() => {
    if (status === "failed" && error) {
      toast.error(error || "Failed to load suggested posts");
    }
  }, [status, error]);

  const getAdPositions = (postCount) => {
    const positions = [];
    let currentPos = 0;
    while (currentPos < postCount) {
      const gap = Math.floor(Math.random() * 3) + 2;
      currentPos += gap;
      if (currentPos < postCount) {
        positions.push(currentPos);
      }
    }
    return positions;
  };

  const adPositions = useMemo(
    () => getAdPositions(posts.length),
    [posts.length]
  );

  return (
    <div className="mt-12 py-8 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 animate-fade-in">
          Explore More Stories
        </h3>
        {status === "loading" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 animate-pulse"
              >
                <Skeleton className="w-full h-48 mb-4 rounded-lg" />
                <Skeleton className="w-3/4 h-6 mb-2" />
                <Skeleton className="w-1/2 h-4" />
              </div>
            ))}
          </div>
        )}
        {status === "failed" && (
          <p className="text-center text-red-600 bg-red-100 py-4 rounded-2xl">
            Error: {error}
          </p>
        )}
        {status === "succeeded" && posts.length === 0 && (
          <p className="text-center bg-white dark:bg-gray-800 py-4 rounded-2xl shadow-lg text-gray-600 dark:text-gray-300">
            No suggested posts available.
          </p>
        )}
        {status === "succeeded" && posts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, index) => (
              <React.Fragment key={post?._id}>
                <Link
                  to={`/post/${post.slug}`}
                  className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 animate-slide-up"
                >
                  {post.thumbnail && (
                    <img
                      src={post.thumbnail}
                      alt={post.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  <div className="p-6">
                    <h4 className="text-xl font-semibold text-gray-900 dark:text-white line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors">
                      {post.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      By {post.author.name} • <TimeAgo date={post.createdAt} />
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-medium group-hover:bg-blue-600 group-hover:text-white transition-colors"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
                {adPositions.includes(index + 1) && (
                  <AdCard
                    key={`ad-${index}`}
                    adIndex={index}
                    adContent="Sponsored Content"
                    adImage="https://placehold.co/150x100?text=Ad+Failed"
                    className="rounded-2xl shadow-lg"
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DisplayPost = () => {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    currentPost: post,
    loading,
    error,
    startTime,
    isTracking,
  } = useSelector((state) => state.post);
  const { isAuthenticated, user: currentUser } = useSelector(
    (state) => state.auth
  );
  const allUsers = useSelector((state) => state.user.users) || [];
  const { isSubscribed, subscriptionLoading, plans } = useSelector(
    (state) => state.subscription
  );
  const { categories } = useSelector((state) => state.categories);
  const viewsData = useSelector((state) => selectPostViews(state, slug));
  const { views } = viewsData;

  const [sessionTime, setSessionTime] = useState(0);
  const [localStartTime, setLocalStartTime] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [showSeeMore, setShowSeeMore] = useState(false);

  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((cat) => {
      map[cat._id] = cat.name;
    });
    return map;
  }, [categories]);

  const restrictedPostIds = useMemo(
    () => plans?.flatMap((plan) => plan.postIds || []) || [],
    [plans]
  );

  const isAuthor = currentUser && post?.author?._id === currentUser?._id;
  const isPostRestricted = post?._id && restrictedPostIds.includes(post?._id);
  const canViewPost =
    isAuthor ||
    !isPostRestricted ||
    (isPostRestricted && isSubscribed[post?.author?._id]);
  const isUserSubscribed =
    (post?.author?._id && isSubscribed[post.author._id]) || false;

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return (
      `${hrs ? `${hrs} hr ` : ""}${mins ? `${mins} min ` : ""}${
        secs || (!hrs && !mins) ? `${secs} sec` : ""
      }`.trim() || "0 hr 0 min 0 sec"
    );
  };

  useEffect(() => {
    if (!post?.slug) return;
    if (!isTracking) {
      dispatch(startReading(post?._id));
      setLocalStartTime(Date.now());
    }
    return () => {
      if (isTracking && post?.slug) {
        const timeSpent = Math.floor(
          (Date.now() - (startTime || localStartTime)) / 1000
        );
        if (timeSpent > 3) {
          dispatch(submitReadingTime({ postId: post?._id, timeSpent }))
            .unwrap()
            .catch((error) =>
              toast.error(
                `Failed to record reading time: ${
                  error?.message || "Something went wrong"
                }`
              )
            );
        }
        dispatch(stopReading());
      }
    };
  }, [dispatch, post?.slug, isTracking, startTime, localStartTime]);

  useEffect(() => {
    if (!isTracking || (!startTime && !localStartTime)) return;
    const interval = setInterval(() => {
      setSessionTime(
        Math.floor((Date.now() - (startTime || localStartTime)) / 1000)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [isTracking, startTime, localStartTime]);

  useEffect(() => {
    if (slug) {
      dispatch(getSinglePost(slug)).finally(() => setFetchAttempted(true));
      dispatch(fetchCategories());
    }
  }, [dispatch, slug]);

  useEffect(() => {
    if (post?.slug) {
      dispatch(fetchBookmarkAndLikeStatus(post?._id));
      dispatch(fetchSubscriptionPlansByAuthor(post.author._id));
    }
  }, [dispatch, post?.slug, post?.author?._id]);

  useEffect(() => {
    if (post?.slug && views) {
      const timer = setInterval(
        () => console.log("View count updated:", { slug: post.slug, views }),
        500
      );
      return () => clearInterval(timer);
    }
  }, [views, post?.slug]);

  useEffect(() => {
    if (!isAuthenticated && isPostRestricted && post) {
      setShowSeeMore(true);
    }
  }, [isAuthenticated, isPostRestricted, post]);

  useEffect(() => {
    if (fetchAttempted && !loading) {
      if (error) toast.error(error.message || "An error occurred");
      if (!post) toast.error("Post not found");
      if (isPostRestricted && !canViewPost && post && isAuthenticated)
        toast("This is a paid post. Subscribe to view.", { icon: "🔒" });
    }
  }, [
    fetchAttempted,
    error,
    post,
    loading,
    isPostRestricted,
    canViewPost,
    isAuthenticated,
  ]);

  const getUserById = (userId) =>
    allUsers.find((u) => u._id === userId) || null;

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 animate-pulse">
            <Skeleton className="w-3/4 h-12 mb-6" />
            <div className="flex gap-3 mb-6">
              <Skeleton className="w-28 h-6 rounded-full" />
              <Skeleton className="w-28 h-6 rounded-full" />
            </div>
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
              <Skeleton className="w-24 h-5" />
              <Skeleton className="w-24 h-5" />
              <Skeleton className="w-24 h-5" />
            </div>
            <Skeleton className="w-full h-80 mb-6 rounded-lg" />
            <Skeleton className="w-full h-80 mb-6 rounded-lg" />
          </div>
          <div className="lg:w-96">
            <Skeleton className="w-full h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error && fetchAttempted) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto">
          <PostErrorHandler
            message={error.message || "An error occurred"}
            post={post}
            currentUser={currentUser}
            getUserById={getUserById}
            isPostRestricted={isPostRestricted}
            canViewPost={canViewPost}
            authorId={post?.author?._id}
          />
          <SuggestedPosts />
        </div>
      </div>
    );
  }

  if (!post && fetchAttempted) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8">
            <div className="p-6 bg-red-100 text-red-600 rounded-xl text-center">
              Post not found
            </div>
          </div>
          <SuggestedPosts />
        </div>
      </div>
    );
  }

  if (!post) return null;

  const firstImage = post.blocks?.find((b) => b.type === "image")?.src || "";
  const plainText =
    post.blocks
      ?.filter((b) => b.type === "text")
      .map((b) => b.content)
      .join(" ")
      .slice(0, 150)
      .replace(/\s+\S*$/, "") || "";

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <Toaster position="top-center" reverseOrder={false} />
        <Helmet>
          <title>{post.title || "Loading..."} | My Blog</title>
          <meta name="description" content={plainText} />
          <meta property="og:title" content={post.title || "Loading..."} />
          <meta property="og:description" content={plainText} />
          <meta property="og:image" content={firstImage} />
          <meta property="og:type" content="article" />
          <meta
            property="og:url"
            content={`https://your-domain.com/post/${post.slug}`}
          />
          <meta name="twitter:card" content="summary_large_image" />
        </Helmet>
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 animate-slide-up">
              <article className="prose prose-lg max-w-none">
                <div className="flex gap-3 mb-6">
                  {isUserSubscribed && currentUser && !isAuthor && (
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-400 text-white shadow-md">
                      You're a Member
                    </span>
                  )}
                  {isPostRestricted && (
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-yellow-500 to-yellow-300 text-white shadow-md">
                      Premium Content
                    </span>
                  )}
                </div>
                <h1 className="text-5xl font-serif font-extrabold mb-6 text-gray-900 dark:text-white leading-tight">
                  {post.title}
                </h1>
                {post.thumbnail && (
                  <img
                    src={post.thumbnail}
                    alt="post-thumbnail"
                    className="w-full h-auto object-cover rounded-2xl mb-6 shadow-md"
                    onError={(e) => {
                      e.target.src =
                        "https://placehold.co/400x240?text=Image+Failed";
                      toast.error("Failed to load post thumbnail");
                    }}
                  />
                )}
                <div className="flex flex-wrap items-center justify-between gap-4 text-sm mb-8">
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <span className="text-blue-600">📁</span>
                      {categoryMap[post.category] ||
                        post.category ||
                        "Uncategorized"}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-green-600">👤</span>
                      {post.author?._id ? (
                        <Link
                          to={`/author/${post.author._id}`}
                          className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors font-medium"
                        >
                          {post.author?.name || "Unknown author"}
                        </Link>
                      ) : (
                        "Unknown author"
                      )}
                    </span>
                    <TotalView slug={post.slug} authorId={post.author?._id} />
                    <span className="flex items-center gap-2">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Read time: {formatTime(post.timeSpent || 0)}
                      </p>
                    </span>
                    <span className="flex items-center gap-2 text-yellow-500">
                      <TimeAgo date={post.createdAt} />
                    </span>
                  </div>
                  <PostOptionsDropdown
                    isAuthor={isAuthor}
                    post={post}
                    setIsDeleteModalOpen={setIsDeleteModalOpen}
                  />
                </div>
                <hr className="mb-8 border-gray-200 dark:border-gray-700" />
                <BlockRenderer
                  blocks={post.blocks || []}
                  postId={post?._id}
                  slug={post.slug}
                  loginUser={currentUser}
                  getUserById={getUserById}
                  isPostRestricted={isPostRestricted}
                  canViewPost={canViewPost}
                  authorId={post.author?._id}
                  isPublished={post.isPublished}
                />
                {showSeeMore && (
                  <div className="mt-6 p-6 bg-gradient-to-r from-blue-600 to-blue-400 rounded-2xl text-center shadow-lg animate-fade-in">
                    <p className="text-white mb-4 text-lg font-medium">
                      Unlock the full story with a subscription.
                    </p>
                    <button
                      onClick={() =>
                        navigate(`/login?redirect=/post/${post.slug}`)
                      }
                      className="px-6 py-3 rounded-full bg-white text-blue-600 font-semibold hover:bg-gray-100 transition-colors duration-200"
                    >
                      Log in to Continue
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-4 my-10">
                  {post?._id && <LikeButton postId={post?._id} />}
                  <ShareButton
                    postUrl={`https://your-domain.com/post/${post?._id}`}
                  />
                  {post?._id && <BookmarkButton postId={post?._id} />}
                </div>
                {post?._id && (
                  <CommentBox
                    postId={post?._id}
                    postAuthorId={post.author?._id}
                  />
                )}
              </article>
            </div>
            <div className="hidden lg:block lg:w-96">
              {post.author?._id && <UserCardWrapper userId={post.author._id} />}
            </div>
          </div>
          <SuggestedPosts />
        </div>
        <Transition show={isUserModalOpen}>
          <Dialog
            onClose={() => setIsUserModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:hidden"
          >
            <Transition.Child
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
            </Transition.Child>
            <Transition.Child
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-auto relative">
                <button
                  className="absolute top-0 -right-2 text-gray-600 dark:text-gray-300 hover:text-red-600 transition-colors p-2"
                  onClick={() => setIsUserModalOpen(false)}
                >
                  <X className="w-6 h-6" />
                </button>
                {post.author?._id && (
                  <UserCardWrapper userId={post.author._id} />
                )}
              </div>
            </Transition.Child>
          </Dialog>
        </Transition>
        <button
          className="fixed top-28 right-4 z-50 bg-gradient-to-r from-blue-600 to-blue-400 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 lg:hidden"
          onClick={() => setIsUserModalOpen(true)}
        >
          Author Info
        </button>
        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          postId={post?._id}
          slug={post.slug}
        />
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default DisplayPost;
