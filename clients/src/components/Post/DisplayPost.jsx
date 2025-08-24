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

  const [sessionTime, setSessionTime] = useState(0);
  const [localStartTime, setLocalStartTime] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [postReady, setPostReady] = useState(false);
  const [showSeeMore, setShowSeeMore] = useState(false);
  const [showAnyway, setShowAnyway] = useState(false);

  const hasFetchedStatus = useRef(false);

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

  useEffect(() => {
    if (!slug) return;

    // CLEAR old data before fetching
    if (isAuthenticated) {
      dispatch({ type: "post/clearCurrentPost" });
    } else {
      dispatch({ type: "guest/clearSinglePost" });
    }

    setFetchAttempted(false);
    setPostReady(false);
    hasFetchedStatus.current = false;

    const fetchData = async () => {
      try {
        if (isAuthenticated) {
          await dispatch(getSinglePost({ slug, isGuest: false })).unwrap();
        } else {
          await dispatch(fetchPublicPostBySlug(slug)).unwrap();
        }
        setFetchAttempted(true);
        setPostReady(true);
        if (isAuthenticated) {
          dispatch(fetchCategories());
        }
      } catch (err) {
        console.error("[DisplayPost] Failed to fetch post:", err);
        toast.error(err?.message || "Post not found");
        setFetchAttempted(true);
        setPostReady(false);
      }
    };

    fetchData();
  }, [dispatch, slug, isAuthenticated]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      !activePost?._id ||
      !activePost?.author?._id ||
      hasFetchedStatus.current
    )
      return;
    hasFetchedStatus.current = true;

    dispatch(fetchBookmarkAndLikeStatus(activePost._id)).catch(() =>
      toast.error("Failed to fetch interaction status")
    );

    dispatch(fetchSubscriptionPlansByAuthor(activePost.author._id)).catch(
      (err) => console.error("Subscription fetch error:", err)
    );
  }, [
    dispatch,
    activePost?._id,
    activePost?.author?._id,
    isAuthenticated,
    slug,
  ]);
  // old code
  // useEffect(() => {
  //   if (activePost?.slug && !isTracking && !localStartTime) {
  //     dispatch(startReading(activePost._id));
  //     setLocalStartTime(Date.now());
  //   }

  //   return () => {
  //     if (isTracking && activePost?.slug && localStartTime) {
  //       const timeSpent = Math.floor((Date.now() - localStartTime) / 1000);
  //       if (timeSpent > 3) {
  //         dispatch(submitReadingTime({ postId: activePost._id, timeSpent }))
  //           .unwrap()
  //           .catch((error) =>
  //             console.error(
  //               "[DisplayPost] Failed to record reading time:",
  //               error
  //             )
  //           );
  //       }
  //       dispatch(stopReading());
  //     }
  //   };
  // }, [dispatch, activePost?.slug, activePost?._id, isTracking, localStartTime]);

  // new code
  useEffect(() => {
    if (activePost?.slug && isAuthenticated && !isTracking && !localStartTime) {
      dispatch(startReading(activePost._id));
      setLocalStartTime(Date.now());
    }

    return () => {
      if (
        isAuthenticated &&
        isTracking &&
        activePost?._id &&
        localStartTime &&
        !activeError // ✅ Prevent API call if post fetch failed or deleted
      ) {
        const timeSpent = Math.floor((Date.now() - localStartTime) / 1000);
        if (timeSpent > 3) {
          dispatch(submitReadingTime({ postId: activePost._id, timeSpent }))
            .unwrap()
            .catch((error) => {
              if (error?.message !== "Post not found") {
                console.error(
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
  ]);

  useEffect(() => {
    if (!isTracking || !localStartTime) return;
    const interval = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - localStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTracking, localStartTime]);

  useEffect(() => {
    if (!isAuthenticated && isPostRestricted && activePost && !showSeeMore) {
      setShowSeeMore(true);
    }
  }, [isAuthenticated, isPostRestricted, activePost]);

  useEffect(() => {
    if (!fetchAttempted) return;

    if (!postReady && !activeLoading) {
      navigate("/404", { replace: true });
    }

    if (activeError && !activeLoading) {
      toast.error(activeError || "An error occurred");
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
    slug,
    navigate,
  ]);

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
    if (!fetchAttempted || activeLoading || subscriptionLoading)
      return renderSkeleton();

    if (
      !postReady ||
      !activePost ||
      !activePost._id ||
      !Array.isArray(activePost.blocks)
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
        <Helmet>
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
              postId={activePost._id}
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
