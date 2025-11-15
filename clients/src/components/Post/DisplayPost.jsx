import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet, HelmetProvider } from "react-helmet-async";
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
    (state) => state.auth
  );
  const { isSubscribed, subscriptionLoading, plans } = useSelector(
    (state) => state.subscription
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

  // Memoized values
  const categoryMap = useMemo(() => {
    if (!Array.isArray(categories)) return {};
    return categories.reduce((map, cat) => {
      if (cat?._id && cat?.name) {
        map[cat._id] = cat.name;
      }
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
        currentUser._id === activePost.author._id
    );
  }, [currentUser, activePost]);

  const isPostRestricted = useMemo(() => {
    // Guests cannot see restrictions - they see public version
    if (!isAuthenticated) return false;
    if (!activePost?._id) return false;
    return restrictedPostIds.includes(activePost._id);
  }, [activePost?._id, restrictedPostIds, isAuthenticated]);

  const canViewPost = useMemo(() => {
    // Guests can always view public posts
    if (!isAuthenticated) return true;

    // Authors can always view their own posts
    if (isAuthor) return true;

    // If post is not restricted, anyone can view
    if (!isPostRestricted) return true;

    // If post is restricted, check subscription
    return Boolean(
      activePost?.author?._id && isSubscribed?.[activePost.author._id]
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
      activePost?.author?._id && isSubscribed?.[activePost.author._id]
    );
  }, [activePost?.author?._id, isSubscribed]);

  // Set component mounted status
  useEffect(() => {
    componentMountedRef.current = true;
    return () => {
      componentMountedRef.current = false;
    };
  }, []);

  // Main fetch effect - Reset and fetch post data when slug changes
  useEffect(() => {
    if (!slug) {
      console.warn("[DisplayPost] No slug provided");
      return;
    }

    // Reset all state when slug changes
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

    // Clear old post data from store
    if (isAuthenticated) {
      dispatch(clearCurrentPost());
    } else {
      dispatch({ type: "guest/clearSinglePost" });
    }

    const fetchData = async () => {
      try {
        if (isAuthenticated) {
          await dispatch(getSinglePost({ slug, isGuest: false })).unwrap();
          // Fetch categories for authenticated users
          dispatch(fetchCategories()).catch((err) =>
            console.warn("[DisplayPost] Categories fetch failed:", err)
          );
        } else {
          await dispatch(fetchPublicPostBySlug(slug)).unwrap();
        }

        if (componentMountedRef.current) {
          setFetchAttempted(true);
          setPostReady(true);
        }
      } catch (err) {
        console.error("[DisplayPost] Failed to fetch post:", err);
        if (componentMountedRef.current) {
          const errorMessage = err?.message || "Failed to load post";
          toast.error(errorMessage);
          setFetchAttempted(true);
          setPostReady(false);
        }
      }
    };

    fetchData();
  }, [dispatch, slug, isAuthenticated]);

  // Fetch bookmark/like status and subscription plans (authenticated users only)
  useEffect(() => {
    if (!isAuthenticated || !activePost?._id || !activePost?.author?._id) {
      return;
    }

    if (hasFetchedStatus.current) {
      return;
    }

    hasFetchedStatus.current = true;

    // Fetch interaction status
    dispatch(fetchBookmarkAndLikeStatus(activePost._id))
      .unwrap()
      .catch((err) => {
        console.warn("[DisplayPost] Failed to fetch interaction status:", err);
      });

    // Fetch subscription plans
    dispatch(fetchSubscriptionPlansByAuthor(activePost.author._id))
      .unwrap()
      .catch((err) => {
        console.warn("[DisplayPost] Failed to fetch subscription plans:", err);
      });
  }, [dispatch, activePost?._id, activePost?.author?._id, isAuthenticated]);

  // Reading time tracking (authenticated users only)
  useEffect(() => {
    if (!isAuthenticated || !activePost?._id || !activePost?.slug) {
      return;
    }

    // Start tracking if not already tracking
    if (!isTracking && !localStartTime) {
      dispatch(startReading(activePost._id));
      setLocalStartTime(Date.now());
    }

    // Cleanup function to submit reading time
    return () => {
      if (
        isTracking &&
        localStartTime &&
        !activeError &&
        !readingTimeSubmitted.current &&
        componentMountedRef.current
      ) {
        const timeSpent = Math.floor((Date.now() - localStartTime) / 1000);

        // Only submit if user spent more than 3 seconds
        if (timeSpent > 3) {
          readingTimeSubmitted.current = true;
          dispatch(submitReadingTime({ postId: activePost._id, timeSpent }))
            .unwrap()
            .catch((error) => {
              // Ignore 404 errors (post might have been deleted)
              if (error?.status !== 404) {
                console.warn(
                  "[DisplayPost] Failed to record reading time:",
                  error
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
    if (!isTracking || !localStartTime) {
      return;
    }

    const interval = setInterval(() => {
      if (localStartTime && componentMountedRef.current) {
        setSessionTime(Math.floor((Date.now() - localStartTime) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking, localStartTime]);

  // Handle 404 navigation with delay
  useEffect(() => {
    if (!fetchAttempted) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (
        !postReady &&
        !activeLoading &&
        fetchAttempted &&
        componentMountedRef.current
      ) {
        navigate("/404", { replace: true });
      }
    }, 1000); // Give 1 second for data to load

    return () => clearTimeout(timeoutId);
  }, [fetchAttempted, postReady, activeLoading, navigate]);

  // Handle subscription toast (authenticated users only, show once)
  useEffect(() => {
    if (
      !isAuthenticated ||
      hasShownSubscriptionToast ||
      !postReady ||
      activeLoading ||
      !activePost?._id ||
      !fetchAttempted
    ) {
      return;
    }

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

  // Constants
  const BASE_URL = import.meta.env.VITE_API_URL || "https://readzio.com";

  // Helper functions
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

  // const renderPostContent = () => {
  //   // Show skeleton while loading or before fetch attempt
  //   if (activeLoading || subscriptionLoading || !fetchAttempted) {
  //     return renderSkeleton();
  //   }

  //   // Show error if there's an error
  //   if (activeError) {
  //     return <PostNotFound message={activeError} />;
  //   }

  //   // Show not found if no post data
  //   if (!activePost?._id || !Array.isArray(activePost.blocks)) {
  //     return <PostNotFound message="Post not found" />;
  //   }

  //   // Extract metadata for SEO
  //   const firstImage =
  //     activePost.blocks?.find((b) => b?.type === "image")?.src ||
  //     activePost.thumbnail ||
  //     "/logo.png";

  //   const plainText =
  //     activePost.blocks
  //       ?.filter((b) => b?.type === "text")
  //       .map((b) => b?.content || b?.text || "")
  //       .join(" ")
  //       .slice(0, 160)
  //       .replace(/\s+\S*$/, "") || "Read this post on readzio";

  //   const jsonLd = {
  //     "@context": "https://schema.org",
  //     "@type": "BlogPosting",
  //     headline: activePost.title || "readzio Post",
  //     description: plainText,
  //     image: firstImage,
  //     author: {
  //       "@type": "Person",
  //       name: activePost.author?.fullName || "readzio Author",
  //     },
  //     publisher: {
  //       "@type": "Organization",
  //       name: "readzio",
  //       logo: {
  //         "@type": "ImageObject",
  //         url: `${BASE_URL}/logo.png`,
  //       },
  //     },
  //     url: `${BASE_URL}/post/${activePost.slug}`,
  //     datePublished: activePost.createdAt,
  //     dateModified: activePost.updatedAt || activePost.createdAt,
  //   };

  //   return (
  //     <>
  //       <Helmet>
  //         <title>
  //           {activePost.title
  //             ? `${activePost.title} | readzio`
  //             : "Loading... | readzio"}
  //         </title>
  //         <meta name="robots" content="index, follow" />
  //         <meta name="description" content={plainText} />
  //         <link rel="canonical" href={`${BASE_URL}/post/${activePost.slug}`} />

  //         {/* Open Graph */}
  //         <meta
  //           property="og:title"
  //           content={activePost.title || "readzio Post"}
  //         />
  //         <meta property="og:description" content={plainText} />
  //         <meta property="og:image" content={firstImage} />
  //         <meta property="og:type" content="article" />
  //         <meta
  //           property="og:url"
  //           content={`${BASE_URL}/post/${activePost.slug}`}
  //         />

  //         {/* Twitter Card */}
  //         <meta name="twitter:card" content="summary_large_image" />
  //         <meta
  //           name="twitter:title"
  //           content={activePost.title || "readzio Post"}
  //         />
  //         <meta name="twitter:description" content={plainText} />
  //         <meta name="twitter:image" content={firstImage} />

  //         {/* JSON-LD structured data */}
  //         <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
  //       </Helmet>

  //       <article className="space-y-8 prose prose-lg max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
  //         <PostHeader post={activePost} />
  //         <PostMetaSection
  //           post={activePost}
  //           isUserSubscribed={isUserSubscribed}
  //           isAuthor={isAuthor}
  //           isPostRestricted={isPostRestricted}
  //           categoryMap={categoryMap}
  //           formatTime={formatTime}
  //           setIsDeleteModalOpen={setIsDeleteModalOpen}
  //         />
  //         <BlockContentRenderer
  //           post={activePost}
  //           isAuthor={isAuthor}
  //           showAnyway={showAnyway}
  //           setShowAnyway={setShowAnyway}
  //           canViewPost={canViewPost}
  //           isPostRestricted={isPostRestricted}
  //           currentUser={currentUser}
  //           getUserById={(userId) =>
  //             userId === activePost.author?._id ? activePost.author : null
  //           }
  //         />
  //         <SubscriptionBanner
  //           showSeeMore={showSeeMore}
  //           post={activePost}
  //           isPostRestricted={isPostRestricted}
  //           canViewPost={canViewPost}
  //         />
  //         <EngagementButtons post={activePost} />
  //         {activePost._id && activePost.author?._id && (
  //           <CommentBox
  //             postId={activePost._id}
  //             postAuthorId={activePost.author._id}
  //           />
  //         )}
  //       </article>
  //     </>
  //   );
  // };

  const renderPostContent = () => {
    // Show skeleton while loading or before fetch attempt
    if (activeLoading || subscriptionLoading || !fetchAttempted) {
      return renderSkeleton();
    }

    // Show error if there's an error
    if (activeError) {
      return <PostNotFound message={activeError} />;
    }

    // Show not found if no post data
    if (!activePost?._id || !Array.isArray(activePost.blocks)) {
      return <PostNotFound message="Post not found" />;
    }

    // ---------------------------------------------
    // ✅ Extract first TEXT block properly
    // ---------------------------------------------
    const firstTextBlock = activePost.blocks?.find(
      (b) => b?.type === "text" && b?.value
    );

    const descriptionHtml = firstTextBlock?.value || "";

    const plainDescription =
      descriptionHtml
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160)
        .trim() || "Read this post on readzio";

    // Extract first image
    const firstImage =
      activePost.blocks?.find((b) => b?.type === "image")?.src ||
      activePost.blocks?.find((b) => b?.type === "image")?.url ||
      activePost.thumbnail ||
      `${BASE_URL}/logo.png`;

    // JSON-LD structured data
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: activePost.title || "readzio Post",
      description: plainDescription,
      image: firstImage,
      author: {
        "@type": "Person",
        name: activePost.author?.fullName || "readzio Author",
      },
      publisher: {
        "@type": "Organization",
        name: "readzio",
        logo: {
          "@type": "ImageObject",
          url: `${BASE_URL}/logo.png`,
        },
      },
      url: `${BASE_URL}/post/${activePost.slug}`,
      datePublished: activePost.createdAt || new Date().toISOString(),
      dateModified:
        activePost.updatedAt ||
        activePost.createdAt ||
        new Date().toISOString(),
    };

    return (
      <>
        <Helmet>
          <title>
            {activePost.title
              ? `${activePost.title} | readzio`
              : "Loading... | readzio"}
          </title>

          <meta name="robots" content="index, follow" />
          {/* ✅ Updated description */}
          <meta name="description" content={plainDescription} />

          <link rel="canonical" href={`${BASE_URL}/post/${activePost.slug}`} />

          {/* Open Graph */}
          <meta
            property="og:title"
            content={activePost.title || "readzio Post"}
          />
          <meta property="og:description" content={plainDescription} />
          <meta property="og:image" content={firstImage} />
          <meta property="og:type" content="article" />
          <meta
            property="og:url"
            content={`${BASE_URL}/post/${activePost.slug}`}
          />

          {/* Twitter Card */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta
            name="twitter:title"
            content={activePost.title || "readzio Post"}
          />
          <meta name="twitter:description" content={plainDescription} />
          <meta name="twitter:image" content={firstImage} />

          {/* JSON-LD structured data */}
          <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        </Helmet>

        <article className="space-y-8 prose prose-lg max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
          <PostHeader post={activePost} />

          {/* ---------------------------------------------
            ✅ VISIBLE DESCRIPTION BOX (first text block)
        ---------------------------------------------- */}
          {descriptionHtml && (
            <div
              className="text-[1.15rem] leading-relaxed text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          )}

          <PostMetaSection
            post={activePost}
            isUserSubscribed={isUserSubscribed}
            isAuthor={isAuthor}
            isPostRestricted={isPostRestricted}
            categoryMap={categoryMap}
            formatTime={formatTime}
            setIsDeleteModalOpen={setIsDeleteModalOpen}
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
              postAuthorId={activePost.author._id}
            />
          )}
        </article>
      </>
    );
  };

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100 font-sans antialiased">
          <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="lg:grid lg:grid-cols-3 lg:gap-10">
              <div className="lg:col-span-2 space-y-8">
                {renderPostContent()}
                {activePost?._id && (
                  <MultiplexAd postId={activePost._id} testMode={false} />
                )}
              </div>

              <div className="hidden lg:block lg:col-span-1 space-y-8">
                <div className="sticky -top-76 space-y-8">
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
                authorId={activePost.author._id}
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
              postId={activePost._id}
              slug={activePost.slug}
            />
          )}
        </div>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default DisplayPost;
