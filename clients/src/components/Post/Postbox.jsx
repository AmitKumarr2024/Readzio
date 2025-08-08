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
import {
  getAllPosts,
  fetchFollowingPosts,
  getSinglePost,
} from "../../store/postSlice";
import { fetchCommentCount } from "../../store/commentSlice";
import { fetchCategories } from "../../store/categorySlice";
import { fetchFollowers } from "../../store/followSlice";
import {
  selectSocketState,
  fetchInitialPostCounts,
} from "../../store/socketSlice";
import { fetchPostsSequentially } from "../../Utils/fetchPostsSequentially";
import Sorted from "../Tabs/Sorted";
import ErrorBoundary from "./ErrorBoundary";
import Skeleton from "@/components/Ui/Skeleton";
import MultiplexAd from "../../Ads/MultiplexAd";
import SafeInFeedAd from "../../Ads/SafeInFeedAd";
import useWindowWidth from "../../Utils/useWindowWidth";

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

  const postsPerPage = 6; // Reduced for faster initial load
  const [currentPage, setCurrentPage] = useState(1);
  const observer = useRef(null);
  const lastPostElementRef = useRef(null);

  const cardsPerRow = useMemo(() => {
    if (isSidebarOpen) {
      return window.innerWidth >= 1280
        ? 4
        : window.innerWidth >= 1024
        ? 3
        : window.innerWidth >= 768
        ? 3
        : 2;
    }
    return window.innerWidth >= 1280
      ? 5
      : window.innerWidth >= 1024
      ? 3
      : window.innerWidth >= 768
      ? 3
      : 2;
  }, [isSidebarOpen]);

  useEffect(() => {
    dispatch(fetchCategories());
    if (currentUser._id) dispatch(fetchFollowers());
    dispatch(fetchInitialPostCounts());
  }, [dispatch, currentUser._id]);

  useEffect(() => {
    if (customPosts.length) return;
    const options = { page: 1, limit: postsPerPage };
    const loadInitialPosts = async () => {
      try {
        let metaPosts;
        if (filterType === "Following") {
          metaPosts = await dispatch(fetchFollowingPosts(options)).unwrap();
        } else if (filterType === "Followers" && followers.list.length) {
          metaPosts = await dispatch(
            getAllPosts({
              authorIds: followers.list.map((u) => u._id),
              ...options,
            })
          ).unwrap();
        } else if (filterType === "My Posts" && user?._id) {
          metaPosts = await dispatch(
            getAllPosts({ userId: user._id, ...options })
          ).unwrap();
        } else {
          metaPosts = await dispatch(getAllPosts(options)).unwrap();
        }
        await fetchPostsSequentially({
          dispatch,
          posts: metaPosts.posts.map((p) => ({ slug: p.slug })),
          getThunk: ({ slug }) => getSinglePost({ slug }),
        });
      } catch (e) {
        console.error("Failed to load initial posts:", e);
      }
    };
    loadInitialPosts();
  }, [dispatch, filterType, user?._id, customPosts.length, followers.list]);

  useEffect(() => {
    if (!socket) return;

    const handlePostEvent = debounce((action, data) => {
      if (customPosts.length) return;
      const options = { page: 1, limit: postsPerPage };
      const updateCounts = (newCounts) =>
        dispatch({ type: "socket/setPostCounts", payload: newCounts });

      const reloadPosts = async () => {
        try {
          let metaPosts;
          if (filterType === "Following") {
            metaPosts = await dispatch(fetchFollowingPosts(options)).unwrap();
          } else if (filterType === "My Posts" && user?._id) {
            metaPosts = await dispatch(
              getAllPosts({ userId: user._id, ...options })
            ).unwrap();
          } else {
            metaPosts = await dispatch(getAllPosts(options)).unwrap();
          }
          await fetchPostsSequentially({
            dispatch,
            posts: metaPosts.posts.map((p) => ({ slug: p.slug })),
            getThunk: ({ slug }) => getSinglePost({ slug }),
          });
        } catch (e) {
          console.error("Failed to reload posts:", e);
        }
      };

      if (action === "postCreated") {
        updateCounts({
          allPostsCount: postCounts.allPostsCount + 1,
          myPostsCount:
            data.authorId === user?._id
              ? postCounts.myPostsCount + 1
              : postCounts.myPostsCount,
          followingPostsCount: followers.list
            .map((u) => u._id)
            .includes(data.authorId)
            ? postCounts.followingPostsCount + 1
            : postCounts.followingPostsCount,
        });
        reloadPosts();
      } else if (action === "postUpdated") {
        reloadPosts();
      } else if (action === "postDeleted") {
        updateCounts({
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
        });
        reloadPosts();
      }
    }, 1000); // Increased debounce delay

    socket.on("postCreated", (data) => handlePostEvent("postCreated", data));
    socket.on("postUpdated", () => handlePostEvent("postUpdated"));
    socket.on("postDeleted", (data) => handlePostEvent("postDeleted", data));

    return () => {
      socket.off("postCreated");
      socket.off("postUpdated");
      socket.off("postDeleted");
    };
  }, [
    socket,
    dispatch,
    customPosts.length,
    filterType,
    user?._id,
    postCounts,
    followers.list,
  ]);

  const categoryMap = useMemo(() => {
    return categories.reduce((map, cat) => {
      if (cat?._id) map[cat._id] = cat.name || "Uncategorized";
      return map;
    }, {});
  }, [categories]);

  const filteredPosts = useMemo(() => {
    const sourcePosts = customPosts.length ? customPosts : posts;
    let validPosts = sourcePosts.filter(
      (post) => post?._id && post?.isPublished && !post?.blocked && post?.author
    );

    if (category) {
      validPosts = validPosts.filter((post) => {
        const postCategorySlug =
          typeof post.category === "object"
            ? post.category?.slug?.toLowerCase()
            : categories
                .find((cat) => cat._id === post.category)
                ?.slug?.toLowerCase();
        return postCategorySlug === category.toLowerCase();
      });
    }

    if (filterType === "My Posts") {
      validPosts = validPosts.filter((post) => post.author?._id === user?._id);
    } else if (filterType === "Followers") {
      const followersIds = followers.list.map((user) => user._id);
      validPosts = validPosts.filter((post) =>
        followersIds.includes(String(post.author?._id))
      );
    } else if (filterType === "Following") {
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
    return sortedPosts.slice(0, currentPage * postsPerPage).map((post) => ({
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
      likesCount: post?.likes?.length ?? 0,
      viewsCount: post?.viewsCount ?? 0,
      bookmarksCount: post?.bookmarksCount ?? 0,
      shareCount: post?.shareCount ?? 0,
      isSubscriberOnly: post?.isSubscriberOnly ?? false,
      postType: post?.postType || "Article",
      isPremium: post?.isPremium ?? false,
      tags: post?.tags || [],
      readTime: post?.readTime,
    }));
  }, [sortedPosts, categoryMap, currentPage]);

  useEffect(() => {
    const postsToFetch = selectedPosts.filter(
      (post) => post?._id && commentCounts[post._id] === undefined
    );
    if (postsToFetch.length) {
      dispatch(fetchCommentCount(postsToFetch.map((post) => post._id))); // Batch fetch
    }
  }, [dispatch, selectedPosts, commentCounts]);

  const screenWidth = useWindowWidth();

  const insertAdsIntoPosts = (posts) => {
    const result = [...posts];
    const items = [];
    const adFrequency = screenWidth < 1024 && screenWidth >= 768 ? 8 : 9;

    for (let i = 0; i < result.length; i++) {
      items.push(result[i]);
      if ((i + 1) % 6 === 0) {
        items.push({
          type: "card-ad",
          id: `card-ad-${i}`,
          postId: result[i]._id,
        });
      }
      if ((i + 1) % adFrequency === 0) {
        items.push({
          type: "multiplex-ad",
          id: `multiplex-ad-${i}`,
          postId: result[i]._id,
        });
      }
    }
    return items;
  };

  const itemsWithAds = useMemo(
    () => insertAdsIntoPosts(selectedPosts),
    [selectedPosts, screenWidth]
  );

  const loadMorePosts = useCallback(async () => {
    if (!postLoading && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      const options = { page: nextPage, limit: postsPerPage };
      try {
        let metaPosts;
        if (filterType === "Following") {
          metaPosts = await dispatch(fetchFollowingPosts(options)).unwrap();
        } else if (filterType === "Followers" && followers.list.length) {
          metaPosts = await dispatch(
            getAllPosts({
              authorIds: followers.list.map((user) => user._id),
              ...options,
            })
          ).unwrap();
        } else if (filterType === "My Posts" && user?._id) {
          metaPosts = await dispatch(
            getAllPosts({ userId: user._id, ...options })
          ).unwrap();
        } else {
          metaPosts = await dispatch(getAllPosts(options)).unwrap();
        }
        await fetchPostsSequentially({
          dispatch,
          posts: metaPosts.posts.map((p) => ({ slug: p.slug })),
          getThunk: ({ slug }) => getSinglePost({ slug }),
        });
      } catch (e) {
        console.error("Failed to load posts:", e);
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
      if (observer.current && lastPostElementRef.current)
        observer.current.unobserve(lastPostElementRef.current);
    };
  }, [loadMorePosts, hasMore, postLoading]);

  const renderSkeletonGrid = () => (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-${cardsPerRow} gap-4 py-6 w-full`}
    >
      {Array.from({ length: postsPerPage }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-48 w-full rounded-lg bg-gray-200 dark:bg-gray-700"
        />
      ))}
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="w-full px-4 py-4">
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
              className={`grid gap-4 py-6 w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-${cardsPerRow}`}
            >
              {itemsWithAds.length ? (
                itemsWithAds.map((item, i) => {
                  if (item.type === "card-ad") {
                    return (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden w-full"
                      >
                        <SafeInFeedAd postId={item.postId} />
                      </div>
                    );
                  }
                  if (item.type === "multiplex-ad") {
                    return (
                      <div
                        key={item.id}
                        className="col-span-full w-full flex justify-center border-t border-b border-gray-300 dark:border-gray-600 my-4"
                      >
                        <MultiplexAd postId={item.postId} />
                      </div>
                    );
                  }
                  return (
                    <div
                      key={item._id || `post-${i}`}
                      ref={
                        i === itemsWithAds.length - 1
                          ? lastPostElementRef
                          : null
                      }
                      className="w-full"
                    >
                      <CardOfPost
                        {...item}
                        commentsCount={commentCounts[item._id] ?? 0}
                        loading={propLoading && !selectedPosts.length}
                        categoryMap={categoryMap}
                        postType={item?.postType}
                        isPremium={item?.isPremium}
                        readTime={item?.readTime}
                      />
                    </div>
                  );
                })
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
                <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Postbox;
