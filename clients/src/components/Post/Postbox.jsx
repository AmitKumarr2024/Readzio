import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { debounce } from "lodash";
import CardOfPost from "../Cards/CardOfPost";
import { getAllPosts, fetchFollowingPosts } from "../../store/postSlice";
import { fetchCommentCount } from "../../store/commentSlice";
import { fetchCategories } from "../../store/categorySlice";
import { fetchFollowers } from "../../store/followSlice";
import {
  selectSocketState,
  fetchInitialPostCounts,
} from "../../store/socketSlice";
import Sorted from "../Tabs/Sorted";
import GoogleAd from "../../Ads/GoogleAd";
import adsConfig from "../../Utils/adsConfig";
import ErrorBoundary from "./ErrorBoundary";
import Skeleton from "@/components/Ui/Skeleton";

const Postbox = ({
  filterType,
  category,
  customPosts = [],
  user,
  loading: propLoading = false,
}) => {
  const dispatch = useDispatch();
  const {
    posts = [],
    loading: postLoading = false,
    error: postError,
  } = useSelector((state) => state.post || {});
  const { commentCounts = {} } = useSelector((state) => state.comment || {});
  const { categories = [] } = useSelector((state) => state.categories || {});
  const isSidebarOpen = useSelector(
    (state) => state.postMeta?.isSidebarOpen ?? false
  );
  const currentUser = useSelector((state) => state.auth?.user ?? { _id: null });
  const { followers = { list: [] } } = useSelector(
    (state) => state.follow || {}
  );
  const { socket, postCounts } = useSelector(selectSocketState);

  const postsPerPage = 12;
  const [currentPage, setCurrentPage] = useState(1);
  const observer = useRef(null);
  const lastPostElementRef = useRef(null);

  useEffect(() => {
    dispatch(fetchCategories());
    if (currentUser._id) dispatch(fetchFollowers());
    dispatch(fetchInitialPostCounts());
  }, [dispatch, currentUser._id]);

  useEffect(() => {
    if (customPosts.length) return;
    const options = { page: 1, limit: postsPerPage };
    if (filterType === "Following") {
      dispatch(fetchFollowingPosts(options));
    } else if (filterType === "Followers" && followers.list.length) {
      dispatch(
        getAllPosts({ authorIds: followers.list.map((u) => u._id), ...options })
      );
    } else if (filterType === "My Posts" && user?._id) {
      dispatch(getAllPosts({ userId: user._id, ...options }));
    } else {
      dispatch(getAllPosts(options));
    }
  }, [dispatch, filterType, user?._id, customPosts.length, followers.list]);

  useEffect(() => {
    if (!socket) return;

    const handlePostCreated = debounce((newPost) => {
      if (customPosts.length) return;
      dispatch({
        type: "socket/setPostCounts",
        payload: {
          allPostsCount: postCounts.allPostsCount + 1,
          myPostsCount:
            newPost.authorId === user?._id
              ? postCounts.myPostsCount + 1
              : postCounts.myPostsCount,
          followingPostsCount: followers.list
            .map((u) => u._id)
            .includes(newPost.authorId)
            ? postCounts.followingPostsCount + 1
            : postCounts.followingPostsCount,
        },
      });
      const options = { page: 1, limit: postsPerPage };
      if (filterType === "Following") {
        dispatch(fetchFollowingPosts(options));
      } else if (filterType === "My Posts" && user?._id) {
        dispatch(getAllPosts({ userId: user._id, ...options }));
      } else {
        dispatch(getAllPosts(options));
      }
    }, 300);

    const handlePostUpdated = debounce(() => {
      if (customPosts.length) return;
      const options = { page: 1, limit: postsPerPage };
      if (filterType === "Following") {
        dispatch(fetchFollowingPosts(options));
      } else if (filterType === "My Posts" && user?._id) {
        dispatch(getAllPosts({ userId: user._id, ...options }));
      } else {
        dispatch(getAllPosts(options));
      }
    }, 300);

    const handlePostDeleted = debounce((data) => {
      if (customPosts.length) return;
      dispatch({
        type: "socket/setPostCounts",
        payload: {
          allPostsCount: Math.max(0, postCounts.allPostsCount - 1),
          myPostsCount:
            data.authorId === user?._id
              ? Math.max(0, postCounts.myPostsCount - 1)
              : postCounts.myPostsCount,
          followingPostsCount: followers.list
            .map((u) => u._id)
            .includes(data.authorId)
            ? Math.max(0, postCounts.followingPostsCount - 1)
            : postCounts.followingPostsCount,
        },
      });
      const options = { page: 1, limit: postsPerPage };
      if (filterType === "Following") {
        dispatch(fetchFollowingPosts(options));
      } else if (filterType === "My Posts" && user?._id) {
        dispatch(getAllPosts({ userId: user._id, ...options }));
      } else {
        dispatch(getAllPosts(options));
      }
    }, 300);

    socket.on("postCreated", handlePostCreated);
    socket.on("postUpdated", handlePostUpdated);
    socket.on("postDeleted", handlePostDeleted);

    return () => {
      socket.off("postCreated", handlePostCreated);
      socket.off("postUpdated", handlePostUpdated);
      socket.off("postDeleted", handlePostDeleted);
    };
  }, [
    socket,
    dispatch,
    customPosts.length,
    postsPerPage,
    filterType,
    user?._id,
    postCounts,
    followers.list,
  ]);

  const categoryMap = useMemo(() => {
    return categories.reduce((map, cat) => {
      if (cat?._id && cat?.name) map[cat._id] = cat.name;
      return map;
    }, {});
  }, [categories]);

  const filteredPosts = useMemo(() => {
    const sourcePosts = customPosts.length ? customPosts : posts;
    let validPosts = sourcePosts.filter(
      (post) =>
        post?._id &&
        post?.isPublished &&
        !post?.blocked &&
        post?.author &&
        post?.category
    );

    if (category) {
      validPosts = validPosts.filter((post) => {
        let postCategorySlug = "";
        if (typeof post.category === "object" && post.category?.slug) {
          postCategorySlug = post.category.slug.toLowerCase();
        } else if (typeof post.category === "string") {
          const matched = categories.find((cat) => cat._id === post.category);
          if (matched) postCategorySlug = matched.slug?.toLowerCase();
        }
        return postCategorySlug === category.toLowerCase();
      });
    }

    if (filterType === "My Posts") {
      validPosts = validPosts.filter((post) => post.author?._id === user?._id);
    }

    if (filterType === "Followers") {
      const followersIds = followers.list.map((user) => user._id);
      validPosts = validPosts.filter(
        (post) =>
          followersIds.includes(String(post.author?._id)) &&
          String(post.author?._id) !== String(currentUser._id)
      );
    }

    if (filterType === "Following") {
      validPosts = validPosts.filter(
        (post) => String(post.author?._id) !== String(currentUser._id)
      );
    }

    return validPosts;
  }, [
    customPosts,
    posts,
    filterType,
    user?._id,
    followers.list,
    category,
    currentUser._id,
  ]);

  const sortedPosts = useMemo(() => {
    const seen = new Set();
    return filteredPosts.filter((post) => {
      if (post?._id && !seen.has(post._id)) {
        seen.add(post._id);
        return true;
      }
      return false;
    });
  }, [filteredPosts]);

  const hasMore = useMemo(
    () => sortedPosts.length >= currentPage * postsPerPage,
    [sortedPosts.length, currentPage]
  );

  const selectedPosts = useMemo(() => {
    return sortedPosts.map((post) => ({
      ...post,
      category: {
        _id:
          typeof post.category === "string"
            ? post.category
            : post.category?._id || "",
      },
      categoryName:
        categoryMap[
          typeof post.category === "string" ? post.category : post.category?._id
        ] || "Uncategorized",
      likesCount: post.likes?.length ?? 0,
      viewsCount: post.viewsCount ?? 0,
      bookmarksCount: post.bookmarksCount ?? 0,
      shareCount: post.shareCount ?? 0,
      isSubscriberOnly: post.isSubscriberOnly ?? false,
      postType: post.postType ?? "free",
      tags: post.tags || [],
      readTime: post?.readTime,
    }));
  }, [sortedPosts, categoryMap]);

  useEffect(() => {
    const postsToFetch = (customPosts.length ? customPosts : posts).filter(
      (post) => post?._id && commentCounts[post._id] === undefined
    );
    postsToFetch.forEach((post) => dispatch(fetchCommentCount(post._id)));
  }, [dispatch, customPosts, posts, commentCounts]);

  const adPositions = useMemo(() => {
    return Array.from(
      { length: Math.floor(selectedPosts.length / 6) },
      (_, i) => (i + 1) * 6
    );
  }, [selectedPosts.length]);

  const loadMorePosts = useCallback(() => {
    if (!postLoading && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);

      if (filterType === "Following") {
        dispatch(fetchFollowingPosts({ page: nextPage, limit: postsPerPage }));
      } else if (filterType === "Followers") {
        dispatch(
          getAllPosts({
            authorIds: followers.list.map((user) => user._id),
            page: nextPage,
            limit: postsPerPage,
          })
        );
      } else if (filterType === "My Posts" && user?._id) {
        dispatch(
          getAllPosts({ userId: user._id, page: nextPage, limit: postsPerPage })
        );
      } else {
        dispatch(getAllPosts({ page: nextPage, limit: postsPerPage }));
      }
    }
  }, [
    dispatch,
    currentPage,
    postLoading,
    hasMore,
    filterType,
    followers.list,
    user?._id,
  ]);

  useEffect(() => {
    if (!lastPostElementRef.current || !hasMore) return;

    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !postLoading) loadMorePosts();
      },
      { threshold: 0.1 }
    );

    observer.current.observe(lastPostElementRef.current);

    return () => {
      if (observer.current && lastPostElementRef.current) {
        observer.current.unobserve(lastPostElementRef.current);
      }
    };
  }, [loadMorePosts, hasMore, postLoading]);

  const renderSkeletonGrid = () => (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${
        isSidebarOpen
          ? "lg:grid-cols-3 xl:grid-cols-4"
          : "lg:grid-cols-3 xl:grid-cols-5"
      } gap-4 py-6 w-full`}
    >
      {Array.from({ length: postsPerPage }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-64 w-full rounded-lg bg-gray-200 dark:bg-gray-700"
        />
      ))}
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="w-full px-4 py-6">
        <Sorted posts={filteredPosts} onSortChange={() => {}} />
        {propLoading && !selectedPosts.length ? (
          renderSkeletonGrid()
        ) : postError ? (
          <p className="text-center text-red-500">
            {postError?.message || "Error loading posts"}
          </p>
        ) : (
          <>
            <div
              className={`grid gap-4 py-6 w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${
                isSidebarOpen
                  ? "lg:grid-cols-3 xl:grid-cols-4"
                  : "lg:grid-cols-3 xl:grid-cols-5"
              }`}
            >
              {selectedPosts.length ? (
                selectedPosts.map((post, i) => (
                  <React.Fragment key={post._id || `post-${i}`}>
                    <div
                      ref={
                        i === selectedPosts.length - 1
                          ? lastPostElementRef
                          : null
                      }
                      className="w-full"
                    >
                      <CardOfPost
                        {...post}
                        commentsCount={commentCounts[post._id] ?? 0}
                        loading={propLoading && !selectedPosts.length}
                        categoryMap={categoryMap}
                        postType={post.postType}
                        readTime={post.readTime}
                      />
                    </div>
                    {adPositions.includes(i + 1) && (
                      <div className="w-full">
                        <div className="bg-white dark:bg-gray-800 rounded-md shadow-md overflow-hidden">
                          <GoogleAd
                            adSlot={adsConfig.card.slot}
                            adFormat={adsConfig.card.format}
                            postId={post._id}
                            style={{
                              display: "block",
                              width: "100%",
                              height: "auto",
                            }}
                            className="block"
                            testMode={true}
                          />
                        </div>
                      </div>
                    )}

                    {(i + 1) % 10 === 0 && (
                      <div className="col-span-full w-full">
                        <div className="bg-white dark:bg-gray-800 rounded-md shadow-md p-2">
                          <GoogleAd
                            adSlot={adsConfig.banner.slot}
                            adFormat="horizontal"
                            postId={post._id}
                            style={{
                              display: "block",
                              width: "100%",
                              height: "100px",
                            }}
                            className="block"
                            testMode={true}
                          />
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <p className="col-span-full text-center text-gray-500">
                  {filterType === "Following"
                    ? "Follow users to see their posts here."
                    : filterType === "Followers"
                    ? "No posts from your followers yet."
                    : filterType === "My Posts"
                    ? "You haven't posted yet."
                    : "No posts found"}
                </p>
              )}
            </div>
            {postLoading && selectedPosts.length > 0 && (
              <div className="flex justify-center py-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Postbox;
