import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async"; // ✅ HelmetProvider HATAYA
import { useDispatch, useSelector } from "react-redux";
import {
  getSinglePost,
  startReading,
  stopReading,
  submitReadingTime,
  clearCurrentPost,
} from "../../store/postSlice";
import { fetchPublicPostBySlug } from "../../store/guestSlice";
import { fetchBookmarkAndLikeStatus } from "../../store/PostInteractions";
import { fetchCategories } from "../../store/categorySlice";
import { fetchSubscriptionPlansByAuthor } from "../../store/subscriptionSlice";
import ErrorBoundary from "../Post/ErrorBoundary";
import PostNotFound from "../Post/DisplayPost/PostNotFound";
import Skeleton from "@/components/Ui/Skeleton";
import PostHeader from "../Post/DisplayPost/PostHeader";
import PostMetaSection from "../Post/DisplayPost/PostMetaSection";
import BlockContentRenderer from "../Post/DisplayPost/BlockContentRenderer";
import EngagementButtons from "../Post/DisplayPost/EngagementButtons";
import SubscriptionBanner from "../Post/DisplayPost/SubscriptionBanner";
import SuggestedPosts from "./SuggestedPosts";
import AuthorSidebar from "../Post/DisplayPost/AuthorSidebar";
import UserModal from "../Post/DisplayPost/UserModal";
import CommentBox from "./CommentBox";
import DeleteModal from "./DeleteModal";
import MultiplexAd from "../../Ads/MultiplexAd";
import DisplayAd from "../../Ads/DisplayAd";
import { toast } from "react-hot-toast";
import { selectPostViews } from "../../Utils/postSelectors";
import AdGuard from "../../Ads/adsGaurd/AdGuard";

// ✅ Module level — re-render pe reset nahi hoga, trailing slash safe
const BASE_URL = (
  import.meta.env.VITE_API_URL || "https://www.readzio.com"
).replace(/\/$/, "");

const DisplayPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux state
  const {
    currentPost: post,
    loading,
    error,
    isTracking,
  } = useSelector((state) => state.post);
  const {
    singlePost: guestPost,
    loading: guestLoading,
    error: guestError,
  } = useSelector((state) => state.guest || {});
  const { isAuthenticated, user: currentUser } = useSelector(
    (state) => state.auth,
  );
  const { isSubscribed, subscriptionLoading, plans } = useSelector(
    (state) => state.subscription,
  );
  const { categories } = useSelector((state) => state.categories);
  const viewsData = useSelector((state) => selectPostViews(state, slug));
  const { views } = viewsData || {};

  // Local state
  const [sessionTime, setSessionTime] = useState(0);
  const [localStartTime, setLocalStartTime] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [postReady, setPostReady] = useState(false);
  const [showSeeMore, setShowSeeMore] = useState(false);
  const [showAnyway, setShowAnyway] = useState(false);
  const [hasShownSubscriptionToast, setHasShownSubscriptionToast] =
    useState(false);

  // Refs
  const hasFetchedStatus = useRef(false);
  const componentMountedRef = useRef(true);
  const readingTimeSubmitted = useRef(false);

  // Determine active post and loading state
  const activePost = isAuthenticated ? post : guestPost;
  const activeLoading = isAuthenticated ? loading : guestLoading;
  const activeError = isAuthenticated ? error : guestError;

  const getSeoDescription = (html, minLength = 150, maxLength = 180) => {
    if (!html) return "";
    const text = html
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length <= maxLength) return text;
    const sentenceEndRegex = new RegExp(`^(.{${minLength},}?[.!?])(\\s|$)`);
    const match = text.match(sentenceEndRegex);
    if (match) return match[1].trim();
    return text
      .slice(0, maxLength)
      .replace(/\s+\S*$/, "")
      .trim();
  };

  const postDescription = useMemo(() => {
    if (!activePost?.blocks) return "";
    const firstTextBlock = activePost.blocks.find(
      (b) => b?.type === "text" && b?.value,
    );
    return getSeoDescription(firstTextBlock?.value, 120, 155);
  }, [activePost]);

  // Memoized values
  const categoryMap = useMemo(() => {
    if (!Array.isArray(categories)) return {};
    return categories.reduce((map, cat) => {
      if (cat?._id && cat?.name) map[cat._id] = cat.name;
      return map;
    }, {});
  }, [categories]);

  const restrictedPostIds = useMemo(() => {
    if (!Array.isArray(plans)) return [];
    return plans.flatMap((plan) => plan?.postIds || []);
  }, [plans]);

  const isAuthor = useMemo(() => {
    return Boolean(
      currentUser?._id &&
      activePost?.author?._id &&
      currentUser._id === activePost?.author?._id,
    );
  }, [currentUser, activePost]);

  const isPostRestricted = useMemo(() => {
    if (!isAuthenticated) return false;
    if (!activePost?._id) return false;
    return restrictedPostIds.includes(activePost._id);
  }, [activePost?._id, restrictedPostIds, isAuthenticated]);

  const canViewPost = useMemo(() => {
    if (!isAuthenticated) return true;
    if (isAuthor) return true;
    if (!isPostRestricted) return true;
    return Boolean(
      activePost?.author?._id && isSubscribed?.[activePost.author?._id],
    );
  }, [
    isAuthor,
    isPostRestricted,
    isSubscribed,
    activePost?.author?._id,
    isAuthenticated,
  ]);

  const isUserSubscribed = useMemo(() => {
    return Boolean(
      activePost?.author?._id && isSubscribed?.[activePost.author?._id],
    );
  }, [activePost?.author?._id, isSubscribed]);

  // Set component mounted status
  useEffect(() => {
    componentMountedRef.current = true;
    return () => {
      componentMountedRef.current = false;
    };
  }, []);

  // Main fetch effect
  useEffect(() => {
    if (!slug) {
      console.warn("[DisplayPost] No slug provided");
      return;
    }

    const resetState = () => {
      setFetchAttempted(false);
      setPostReady(false);
      setSessionTime(0);
      setLocalStartTime(null);
      setShowSeeMore(false);
      setShowAnyway(false);
      setHasShownSubscriptionToast(false);
      hasFetchedStatus.current = false;
      readingTimeSubmitted.current = false;
    };

    resetState();

    if (isAuthenticated) {
      dispatch(clearCurrentPost());
    } else {
      dispatch({ type: "guest/clearSinglePost" });
    }

    const fetchData = async () => {
      try {
        if (isAuthenticated) {
          await dispatch(getSinglePost({ slug, isGuest: false })).unwrap();
          dispatch(fetchCategories()).catch((err) =>
            console.warn("[DisplayPost] Categories fetch failed:", err),
          );
        } else {
          await dispatch(fetchPublicPostBySlug(slug)).unwrap();
        }
        if (componentMountedRef.current) {
          setFetchAttempted(true);
          setPostReady(true);
        }
      } catch (err) {
        console.error("[DisplayPost] Fetch failed", err);
        if (componentMountedRef.current) {
          toast.error(err?.message || "Failed to load post");
          setFetchAttempted(true);
          setPostReady(false);
        }
      }
    };

    fetchData();
  }, [dispatch, slug, isAuthenticated]);

  // Fetch bookmark/like status and subscription plans
  useEffect(() => {
    if (!isAuthenticated || !activePost?._id || !activePost?.author?._id)
      return;
    if (hasFetchedStatus.current) return;
    hasFetchedStatus.current = true;

    dispatch(fetchBookmarkAndLikeStatus(activePost._id))
      .unwrap()
      .catch((err) =>
        console.warn("[DisplayPost] Failed to fetch interaction status:", err),
      );

    dispatch(fetchSubscriptionPlansByAuthor(activePost?.author?._id))
      .unwrap()
      .catch((err) =>
        console.warn("[DisplayPost] Failed to fetch subscription plans:", err),
      );
  }, [dispatch, activePost?._id, activePost?.author?._id, isAuthenticated]);

  // Reading time tracking
  useEffect(() => {
    if (!isAuthenticated || !activePost?._id || !activePost?.slug) return;

    if (!isTracking && !localStartTime) {
      dispatch(startReading(activePost._id));
      setLocalStartTime(Date.now());
    }

    return () => {
      if (
        isTracking &&
        localStartTime &&
        !activeError &&
        !readingTimeSubmitted.current &&
        componentMountedRef.current
      ) {
        const timeSpent = Math.floor((Date.now() - localStartTime) / 1000);
        if (timeSpent > 3) {
          readingTimeSubmitted.current = true;
          dispatch(submitReadingTime({ postId: activePost._id, timeSpent }))
            .unwrap()
            .catch((error) => {
              if (error?.status !== 404) {
                console.warn(
                  "[DisplayPost] Failed to record reading time:",
                  error,
                );
              }
            });
        }
        dispatch(stopReading());
      }
    };
  }, [
    dispatch,
    activePost?._id,
    activePost?.slug,
    isTracking,
    localStartTime,
    isAuthenticated,
    activeError,
  ]);

  // Session time counter
  useEffect(() => {
    if (!isTracking || !localStartTime) return;
    const interval = setInterval(() => {
      if (localStartTime && componentMountedRef.current) {
        setSessionTime(Math.floor((Date.now() - localStartTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isTracking, localStartTime]);

  // Handle 404 navigation
  useEffect(() => {
    if (!fetchAttempted) return;
    const timeoutId = setTimeout(() => {
      if (
        !postReady &&
        !activeLoading &&
        fetchAttempted &&
        componentMountedRef.current
      ) {
        navigate("/404", { replace: true });
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [fetchAttempted, postReady, activeLoading, navigate]);

  // Subscription toast
  useEffect(() => {
    if (
      !isAuthenticated ||
      hasShownSubscriptionToast ||
      !postReady ||
      activeLoading ||
      !activePost?._id ||
      !fetchAttempted
    )
      return;

    if (isPostRestricted && !canViewPost && !isAuthor) {
      toast("This is a paid post. Subscribe to view full content.", {
        icon: "🔒",
        duration: 4000,
      });
      setHasShownSubscriptionToast(true);
    }
  }, [
    postReady,
    activeLoading,
    activePost?._id,
    isPostRestricted,
    canViewPost,
    isAuthenticated,
    fetchAttempted,
    hasShownSubscriptionToast,
    isAuthor,
  ]);

  const formatTime = (seconds) => {
    if (!seconds || typeof seconds !== "number") return "0 sec";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs ? `${hrs} hr ` : ""}${mins ? `${mins} min ` : ""}${
      secs || (!hrs && !mins) ? `${secs} sec` : ""
    }`.trim();
  };

  const renderSkeleton = () => (
    <div className="space-y-6">
      <Skeleton height="h-8" width="w-3/4" />
      <Skeleton height="h-4" width="w-1/2" />
      <div className="space-y-2">
        <Skeleton height="h-32" width="w-full" className="rounded-lg" />
        <Skeleton height="h-6" width="w-3/4" />
        <Skeleton height="h-4" width="w-full" />
        <Skeleton height="h-4" width="w-full" />
        <Skeleton height="h-4" width="w-2/3" />
      </div>
    </div>
  );

  const renderPostContent = () => {
    // 1. Loading states
    if (activeLoading || subscriptionLoading || !fetchAttempted) {
      return renderSkeleton();
    }

    // 2. Error state
    if (activeError) {
      return <PostNotFound message={activeError} />;
    }

    // 3. Invalid post
    if (!activePost?._id || !Array.isArray(activePost.blocks)) {
      return <PostNotFound message="Post not found" />;
    }

    const seoDescription =
      postDescription ||
      "Read this article on Readzio – ideas, discussions, and insights.";

    // ✅ Canonical always = https://www.readzio.com/post/slug
    const canonicalUrl = `${BASE_URL}/post/${activePost.slug}`;

    const firstImage =
      activePost.blocks.find((b) => b?.type === "image")?.src ||
      activePost.blocks.find((b) => b?.type === "image")?.url ||
      activePost.thumbnail ||
      `${BASE_URL}/logo.png`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: activePost.title,
      description: seoDescription,
      image: [firstImage],
      author: {
        "@type": "Person",
        name: activePost.author?.name || "Readzio Author",
        url: `${BASE_URL}/profile/${activePost.author?._id}`,
      },
      publisher: {
        "@type": "Organization",
        name: "Readzio",
        logo: {
          "@type": "ImageObject",
          url: `${BASE_URL}/logo.png`,
        },
      },
      url: canonicalUrl,
      datePublished: activePost.createdAt,
      dateModified: activePost.updatedAt || activePost.createdAt,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": canonicalUrl,
      },

      wordCount: activePost.blocks
        ?.filter((b) => b?.type === "text")
        ?.reduce(
          (acc, b) =>
            acc + (b?.value?.replace(/<[^>]+>/g, "").split(/\s+/).length || 0),
          0,
        ),

      isAccessibleForFree: !isPostRestricted,
    };

    return (
      <>
        {/* ✅ SEO HEAD — HelmetProvider main.jsx mein hai, yahan sirf Helmet */}
        <Helmet>
          <title>{`${activePost.title} | Readzio`}</title>
          <meta name="robots" content="index, follow" />
          <meta name="description" content={seoDescription} />
          {/* ✅ Canonical = exact post URL, homepage nahi */}
          <link rel="canonical" href={canonicalUrl} />

          {/* Open Graph */}
          <meta property="og:title" content={activePost.title} />
          <meta property="og:description" content={seoDescription} />
          <meta property="og:image" content={firstImage} />

          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:type" content="image/jpeg" />
          <meta property="og:type" content="article" />
          <meta property="og:url" content={canonicalUrl} />

          <meta property="og:site_name" content="Readzio" />
          <meta property="og:locale" content="en_IN" />
          <meta
            property="article:published_time"
            content={activePost.createdAt}
          />
          <meta
            property="article:modified_time"
            content={activePost.updatedAt}
          />
          <meta property="article:author" content={activePost.author?.name} />

          {/* Twitter */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={activePost.title} />
          <meta name="twitter:description" content={seoDescription} />
          <meta name="twitter:image" content={firstImage} />

          <meta
            property="article:modified_time"
            content={activePost.updatedAt || activePost.createdAt}
          />
          {/* Structured Data */}
          <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        </Helmet>

        {/* ARTICLE */}
        <article
          className="space-y-8 prose prose-lg max-w-none text-gray-700 dark:text-gray-300 leading-relaxed"
          itemScope
          itemType="https://schema.org/BlogPosting"
        >
          <PostHeader post={activePost} />

          <PostMetaSection
            post={activePost}
            isUserSubscribed={isUserSubscribed}
            isAuthor={isAuthor}
            isPostRestricted={isPostRestricted}
            categoryMap={categoryMap}
            formatTime={formatTime}
            setIsDeleteModalOpen={setIsDeleteModalOpen}
            description={postDescription}
          />

          <BlockContentRenderer
            post={activePost}
            isAuthor={isAuthor}
            showAnyway={showAnyway}
            setShowAnyway={setShowAnyway}
            canViewPost={canViewPost}
            isPostRestricted={isPostRestricted}
            currentUser={currentUser}
            getUserById={(userId) =>
              userId === activePost.author?._id ? activePost.author : null
            }
          />

          <SubscriptionBanner
            showSeeMore={showSeeMore}
            post={activePost}
            isPostRestricted={isPostRestricted}
            canViewPost={canViewPost}
          />

          <EngagementButtons post={activePost} />

          {activePost._id && activePost.author?._id && (
            <CommentBox
              postId={activePost._id}
              postAuthorId={activePost.author?._id}
            />
          )}
        </article>
      </>
    );
  };

  // ✅ HelmetProvider HATAYA — main.jsx mein globally hai
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100 font-sans antialiased">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="lg:grid lg:grid-cols-3 lg:gap-10">
            <div className="lg:col-span-2 space-y-8">
              {renderPostContent()}
              {activePost?._id && (
                <AdGuard placement="multiplex">
                  <MultiplexAd postId={activePost._id} testMode={false} />
                </AdGuard>
              )}
            </div>

            <div className="hidden lg:block lg:col-span-1 space-y-8">
              <div className="sticky top-14 space-y-8">
                <AuthorSidebar
                  authorId={activePost?.author?._id || null}
                  isLoading={
                    activeLoading || subscriptionLoading || !fetchAttempted
                  }
                  className="rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6"
                />
                {activePost?._id && (
                  <div className="sticky top-[calc(100vh-200px)]">
                    <DisplayAd postId={activePost._id} testMode={false} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {activePost?._id && (
          <div className="w-full min-h-screen bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 py-16">
            <ErrorBoundary>
              <SuggestedPosts
                postId={activePost._id}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-full"
              />
            </ErrorBoundary>
          </div>
        )}

        {activePost?.author?._id && (
          <>
            <UserModal
              isOpen={isUserModalOpen}
              onClose={() => setIsUserModalOpen(false)}
              authorId={activePost?.author?._id}
            />
            <button
              className="fixed bottom-6 right-6 lg:hidden bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-full shadow-xl hover:shadow-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 z-50 border border-blue-500/30"
              onClick={() => setIsUserModalOpen(true)}
              aria-label="View author information"
            >
              Author
            </button>
          </>
        )}

        {isAuthor && activePost?._id && activePost?.slug && (
          <DeleteModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            postId={activePost?._id}
            slug={activePost?.slug}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default DisplayPost;
