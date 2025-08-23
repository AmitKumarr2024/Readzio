import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
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
  const { views } = viewsData;

  // Local state
  const [sessionTime, setSessionTime] = useState(0);
  const [localStartTime, setLocalStartTime] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [postReady, setPostReady] = useState(false);
  const [showSeeMore, setShowSeeMore] = useState(false);
  const [showAnyway, setShowAnyway] = useState(false);
  const [currentSlug, setCurrentSlug] = useState(null);

  // Refs for tracking and preventing race conditions
  const hasFetchedStatus = useRef(false);
  const sessionTimeInterval = useRef(null);
  const previousSlug = useRef(null);
  const isInitialMount = useRef(true);
  const fetchController = useRef(null);

  // Derived state
  const activePost = isAuthenticated ? post : guestPost;
  const activeLoading = isAuthenticated ? loading : guestLoading;
  const activeError = isAuthenticated ? error : guestError;

  const categoryMap = useMemo(() => {
    return categories.reduce((map, cat) => {
      map[cat._id] = cat.name;
      return map;
    }, {});
  }, [categories]);

  const restrictedPostIds = useMemo(() => {
    return plans?.flatMap((plan) => plan.postIds || []) || [];
  }, [plans]);

  const isAuthor = useMemo(() => {
    return currentUser && activePost?.author?._id === currentUser?._id;
  }, [currentUser, activePost]);

  const isPostRestricted = useMemo(() => {
    return activePost?._id && restrictedPostIds.includes(activePost._id);
  }, [activePost, restrictedPostIds]);

  const canViewPost = useMemo(() => {
    return (
      isAuthor || !isPostRestricted || isSubscribed[activePost?.author?._id]
    );
  }, [isAuthor, isPostRestricted, isSubscribed, activePost]);

  const isUserSubscribed =
    activePost?.author?._id && isSubscribed[activePost?.author?._id];

  // Cleanup function for reading session
  const cleanupReadingSession = useCallback(() => {
    if (sessionTimeInterval.current) {
      clearInterval(sessionTimeInterval.current);
      sessionTimeInterval.current = null;
    }

    if (isTracking && activePost?._id && localStartTime) {
      const timeSpent = Math.floor((Date.now() - localStartTime) / 1000);
      if (timeSpent > 3) {
        dispatch(submitReadingTime({ postId: activePost._id, timeSpent }))
          .unwrap()
          .catch((error) =>
            console.error("[DisplayPost] Failed to record reading time:", error)
          );
      }
      dispatch(stopReading());
    }

    setLocalStartTime(null);
    setSessionTime(0);
  }, [dispatch, activePost?._id, isTracking, localStartTime]);

  // Reset component state when slug changes
  const resetComponentState = useCallback(() => {
    setFetchAttempted(false);
    setPostReady(false);
    setShowSeeMore(false);
    setShowAnyway(false);
    setIsDeleteModalOpen(false);
    setIsUserModalOpen(false);
    hasFetchedStatus.current = false;

    // Cancel any ongoing fetch
    if (fetchController.current) {
      fetchController.current.abort();
      fetchController.current = null;
    }
  }, []);

  // Main effect for fetching post data when slug changes
  useEffect(() => {
    if (!slug) return;

    console.log(`[DisplayPost] useEffect triggered with slug: ${slug}`);
    console.log(`[DisplayPost] Previous slug: ${previousSlug.current}`);
    console.log(`[DisplayPost] Is initial mount: ${isInitialMount.current}`);

    // Check if this is a new slug or just a re-render
    const isNewSlug = previousSlug.current !== slug;
    previousSlug.current = slug;

    if (!isNewSlug && !isInitialMount.current) {
      console.log(`[DisplayPost] Same slug, skipping fetch`);
      return; // Don't refetch if it's the same slug
    }

    isInitialMount.current = false;

    // Cleanup previous reading session
    cleanupReadingSession();

    // Reset component state
    resetComponentState();

    // Clear previous post data immediately
    console.log(`[DisplayPost] Clearing previous post data`);
    if (isAuthenticated) {
      dispatch(clearCurrentPost());
    } else {
      dispatch({ type: "guest/clearSinglePost" });
    }

    // Update current slug state
    setCurrentSlug(slug);

    console.log(`[DisplayPost] Fetching post with slug: ${slug}`);

    const fetchData = async () => {
      try {
        // Create new AbortController for this fetch
        fetchController.current = new AbortController();

        let result;
        if (isAuthenticated) {
          result = await dispatch(
            getSinglePost({
              slug,
              isGuest: false,
              signal: fetchController.current.signal,
            })
          ).unwrap();
        } else {
          result = await dispatch(
            fetchPublicPostBySlug(slug, {
              signal: fetchController.current.signal,
            })
          ).unwrap();
        }

        // Verify the result matches the current slug
        if (result?.slug === slug) {
          console.log(
            `[DisplayPost] Successfully fetched post: ${result.title}`
          );
          setFetchAttempted(true);
          setPostReady(true);

          if (isAuthenticated) {
            dispatch(fetchCategories());
          }
        } else {
          console.warn(
            `[DisplayPost] Slug mismatch in result: expected ${slug}, got ${result?.slug}`
          );
          setFetchAttempted(true);
          setPostReady(false);
        }
      } catch (err) {
        // Don't show error if request was aborted (component unmounted or slug changed)
        if (err.name !== "AbortError") {
          console.error("[DisplayPost] Failed to fetch post:", err);
          toast.error(err?.message || "Post not found");
        }
        setFetchAttempted(true);
        setPostReady(false);
      } finally {
        fetchController.current = null;
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      if (fetchController.current) {
        fetchController.current.abort();
        fetchController.current = null;
      }
    };
  }, [
    slug,
    isAuthenticated,
    dispatch,
    cleanupReadingSession,
    resetComponentState,
  ]);

  // Effect for fetching additional data when post is loaded
  useEffect(() => {
    if (
      !isAuthenticated ||
      !activePost?._id ||
      !activePost?.author?._id ||
      hasFetchedStatus.current ||
      activePost?.slug !== slug // CRITICAL: Ensure we're fetching for the correct post
    ) {
      return;
    }

    console.log(
      `[DisplayPost] Fetching additional data for post: ${activePost.title}`
    );
    hasFetchedStatus.current = true;

    const fetchAdditionalData = async () => {
      try {
        await Promise.all([
          dispatch(fetchBookmarkAndLikeStatus(activePost._id)),
          dispatch(fetchSubscriptionPlansByAuthor(activePost.author._id)),
        ]);
      } catch (err) {
        console.error("Failed to fetch additional data:", err);
      }
    };

    fetchAdditionalData();
  }, [
    dispatch,
    activePost?._id,
    activePost?.author?._id,
    activePost?.slug, // CRITICAL: Include slug in dependencies
    isAuthenticated,
    slug,
  ]);

  // Effect for starting reading tracking
  useEffect(() => {
    if (
      activePost?.slug === slug && // CRITICAL: Check slug match
      !isTracking &&
      !localStartTime &&
      postReady &&
      activePost?._id
    ) {
      console.log(
        `[DisplayPost] Starting reading tracking for: ${activePost.title}`
      );
      dispatch(startReading(activePost._id));
      setLocalStartTime(Date.now());
    }
  }, [
    dispatch,
    activePost?.slug,
    activePost?._id,
    activePost?.title,
    isTracking,
    localStartTime,
    slug,
    postReady,
  ]);

  // Effect for session time tracking
  useEffect(() => {
    if (!isTracking || !localStartTime) {
      if (sessionTimeInterval.current) {
        clearInterval(sessionTimeInterval.current);
        sessionTimeInterval.current = null;
      }
      return;
    }

    sessionTimeInterval.current = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - localStartTime) / 1000));
    }, 1000);

    return () => {
      if (sessionTimeInterval.current) {
        clearInterval(sessionTimeInterval.current);
        sessionTimeInterval.current = null;
      }
    };
  }, [isTracking, localStartTime]);

  // Effect for handling subscription banner
  useEffect(() => {
    if (!isAuthenticated && isPostRestricted && activePost && !showSeeMore) {
      setShowSeeMore(true);
    }
  }, [isAuthenticated, isPostRestricted, activePost, showSeeMore]);

  // Effect for error handling and navigation
  useEffect(() => {
    if (!fetchAttempted) return;

    if (!postReady && !activeLoading && activeError) {
      console.log("[DisplayPost] Post not found, navigating to 404");
      navigate("/404", { replace: true });
      return;
    }

    if (activeError && !activeLoading) {
      toast.error(activeError || "An error occurred");
      return;
    }

    if (
      postReady &&
      !activeLoading &&
      activePost &&
      isPostRestricted &&
      !canViewPost &&
      isAuthenticated
    ) {
      toast("This is a paid post. Subscribe to view.", { icon: "🔒" });
    }
  }, [
    fetchAttempted,
    postReady,
    activeError,
    activePost,
    activeLoading,
    isPostRestricted,
    canViewPost,
    isAuthenticated,
    navigate,
  ]);

  // Cleanup effect on unmount
  useEffect(() => {
    return () => {
      cleanupReadingSession();
      if (fetchController.current) {
        fetchController.current.abort();
      }
    };
  }, [cleanupReadingSession]);

  // CRITICAL: Prevent rendering if slug mismatch
  if (activePost && activePost.slug && activePost.slug !== slug) {
    console.log(
      `[DisplayPost] Slug mismatch detected: expected ${slug}, got ${activePost.slug}`
    );
    return (
      <ErrorBoundary>
        <HelmetProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <div className="max-w-7xl mx-auto px-8 sm:px-6 lg:px-8 py-8">
              {renderSkeleton()}
            </div>
          </div>
        </HelmetProvider>
      </ErrorBoundary>
    );
  }

  const BASE_URL =
    import.meta.env.VITE_API_URL || "https://inksha-uedq.onrender.com";

  const formatTime = (seconds) => {
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
        <table className="w-full">
          <tbody>
            <tr>
              <td>
                <Skeleton className="h-4 w-24" />
              </td>
              <td>
                <Skeleton className="h-4 w-24" />
              </td>
            </tr>
          </tbody>
        </table>
        <table className="w-full">
          <tbody>
            <tr>
              <td>
                <Skeleton className="h-4 w-12" />
              </td>
              <td>
                <Skeleton className="h-4 w-12" />
              </td>
              <td>
                <Skeleton className="h-4 w-12" />
              </td>
              <td>
                <Skeleton className="h-4 w-12" />
              </td>
              <td>
                <Skeleton className="h-4 w-12" />
              </td>
            </tr>
          </tbody>
        </table>
        <Skeleton height="h-4" width="w-16" />
      </div>
    </div>
  );

  const renderPostContent = () => {
    console.log(`[DisplayPost] renderPostContent called`);
    console.log(`[DisplayPost] fetchAttempted: ${fetchAttempted}`);
    console.log(`[DisplayPost] activeLoading: ${activeLoading}`);
    console.log(`[DisplayPost] postReady: ${postReady}`);
    console.log(`[DisplayPost] activePost slug: ${activePost?.slug}`);
    console.log(`[DisplayPost] current slug: ${slug}`);

    // Show skeleton while loading or if post doesn't match current slug
    if (!fetchAttempted || activeLoading || subscriptionLoading) {
      return renderSkeleton();
    }

    // Show not found if no post or post doesn't match slug
    if (
      !postReady ||
      !activePost ||
      !activePost._id ||
      !Array.isArray(activePost.blocks) ||
      activePost.slug !== slug // CRITICAL CHECK
    ) {
      return <PostNotFound message={activeError || "Post not found"} />;
    }

    const firstImage =
      activePost.blocks?.find((b) => b.type === "image")?.src || "";
    const plainText =
      activePost.blocks
        ?.filter((b) => b.type === "text")
        .map((b) => b.content || b.text || "")
        .join(" ")
        .slice(0, 150)
        .replace(/\s+\S*$/, "") || "";

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: activePost.title,
      description: plainText,
      image: firstImage,
      author: {
        "@type": "Person",
        name: activePost.author?.fullName || "inkshaa Author",
      },
      publisher: { "@type": "Organization", name: "inkshaa" },
      url: `${BASE_URL}/post/${activePost.slug}`,
      datePublished: activePost.createdAt,
    };

    return (
      <>
        <Helmet key={activePost.slug}>
          <title>{activePost.title || "Loading..."} | inkshaa</title>
          <meta name="robots" content="index, follow" />
          <meta name="description" content={plainText} />
          <link rel="canonical" href={`${BASE_URL}/post/${activePost?.slug}`} />
          <meta
            property="og:title"
            content={activePost.title || "Loading..."}
          />
          <meta property="og:description" content={plainText} />
          <meta property="og:image" content={activePost.thumbnail} />
          <meta property="og:type" content="article" />
          <meta
            property="og:url"
            content={`${BASE_URL}/post/${activePost?.slug}`}
          />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={activePost.title} />
          <meta name="twitter:image" content={activePost.thumbnail} />
        </Helmet>

        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>

        <article className="space-y-6">
          <PostHeader post={activePost} />
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
          <SubscriptionBanner showSeeMore={showSeeMore} post={activePost} />
          <EngagementButtons post={activePost} />
          <CommentBox
            postId={activePost._id}
            postAuthorId={activePost.author._id}
          />
        </article>
      </>
    );
  };

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <div className="max-w-7xl mx-auto px-8 sm:px-6 lg:px-8 py-8">
            <div className="lg:grid lg:grid-cols-3 lg:gap-8">
              <div className="lg:col-span-2 space-y-6">
                {renderPostContent()}
                <MultiplexAd postId={activePost?._id} testMode={false} />
              </div>
              <div className="hidden lg:block lg:col-span-1 space-y-6">
                <div className="sticky top-6 space-y-6">
                  <div className="author-wrapper transition-all duration-300">
                    <AuthorSidebar
                      authorId={activePost?.author?._id || null}
                      isLoading={
                        activeLoading || subscriptionLoading || !fetchAttempted
                      }
                      className="h-full rounded-md bg-white dark:bg-gray-800 shadow-md p-6"
                    />
                    <div className="ad-wrapper sticky top-11">
                      <DisplayAd postId={activePost?._id} testMode={false} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full min-h-screen bg-gray-100 dark:bg-gray-800 py-16">
            <ErrorBoundary>
              <SuggestedPosts
                postId={activePost?._id}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-full"
              />
            </ErrorBoundary>
          </div>

          <UserModal
            isOpen={isUserModalOpen}
            onClose={() => setIsUserModalOpen(false)}
            authorId={activePost?.author?._id || null}
          />

          {isAuthor && (
            <DeleteModal
              isOpen={isDeleteModalOpen}
              onClose={() => setIsDeleteModalOpen(false)}
              postId={activePost?._id}
              slug={activePost?.slug}
            />
          )}

          <button
            className="fixed bottom-4 right-4 lg:hidden bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200"
            onClick={() => setIsUserModalOpen(true)}
          >
            Author
          </button>
        </div>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default DisplayPost;
