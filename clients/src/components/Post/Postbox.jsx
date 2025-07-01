// Postbox.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import CardOfPost from "../Cards/CardOfPost";
import Pagination from "../../Utils/Pagination";
import { getAllPosts } from "../../store/postSlice";
import { fetchCommentCount } from "../../store/commentSlice";
import { fetchCategories } from "../../store/categorySlice";
import Sorted from "../Tabs/Sorted";
import AdCard from "../../Utils/AdCard";
import Skeleton from "../ui/Skeleton";

const Postbox = ({ filterType, category, customPosts }) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.user.user);
  const { posts: storePosts, loading, error } = useSelector((state) => state.post);
  const { commentCounts, failedCountFetches, loading: commentsLoading } = useSelector((state) => state.comment);
  const { categories } = useSelector((state) => state.categories);

  const postsPerPage = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const [sortedPosts, setSortedPosts] = useState([]);

  useEffect(() => {
    if (!customPosts) dispatch(getAllPosts({}));
    dispatch(fetchCategories());
  }, [dispatch, customPosts, filterType]);

  const filteredPosts = useMemo(() => {
    let allPosts = customPosts || storePosts || [];

    if (category) {
      allPosts = allPosts.filter((post) => post.category === category);
    }

    if (filterType === "All Posts") return allPosts;

    return allPosts.filter((post) => {
      if (filterType === "My Posts") {
        return post.author?._id === currentUser?.data?._id;
      }
      if (filterType === "Following") {
        const followingIds = currentUser?.data?.following || [];
        return followingIds.includes(post.author?._id);
      }
      return true;
    });
  }, [customPosts, storePosts, filterType, currentUser?.data, category]);

  useEffect(() => {
    setSortedPosts(filteredPosts);
  }, [filteredPosts]);

  const handleSortChange = useCallback((sorted) => {
    setSortedPosts(sorted);
    setCurrentPage(1);
  }, []);

  const selectedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * postsPerPage;
    return sortedPosts.slice(startIndex, startIndex + postsPerPage);
  }, [sortedPosts, currentPage]);

  const totalPages = Math.ceil(sortedPosts.length / postsPerPage);

  useEffect(() => {
    const visiblePosts = customPosts || storePosts;
    visiblePosts.forEach((post) => {
      if (
        post._id &&
        commentCounts?.[post._id] === undefined &&
        !commentsLoading &&
        !failedCountFetches[post._id]
      ) {
        dispatch(fetchCommentCount(post._id));
      }
    });
  }, [dispatch, customPosts, storePosts, commentCounts, commentsLoading, failedCountFetches]);

  const getFirstImage = (blocks) => {
    const imageBlock = blocks?.find((block) => block.type === "image");
    return imageBlock?.src || "https://placehold.co/400x240?text=No+Image";
  };

  const getAdPositions = useMemo(() => {
    const positions = [];
    let currentPos = 0;
    const postCount = selectedPosts.length;
    while (currentPos < postCount) {
      const gap = Math.floor(Math.random() * 4) + 6;
      currentPos += gap;
      if (currentPos < postCount) {
        positions.push(currentPos);
      }
    }
    return positions;
  }, [selectedPosts.length]);

  const renderSkeletonGrid = () => (
    <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 py-6">
      {[...Array(postsPerPage)].map((_, index) => (
        <div key={index} className="w-full overflow-hidden rounded-2xl bg-white shadow-lg border border-gray-200">
          <Skeleton width="w-full" height="aspect-[2/1]" rounded="rounded-t-2xl" />
          <div className="p-4 flex flex-col gap-3">
            <Skeleton width="w-3/4" height="h-6" rounded="rounded" />
            <Skeleton width="w-full" height="h-4" rounded="rounded" />
            <Skeleton width="w-full" height="h-4" rounded="rounded" />
            <Skeleton width="w-1/2" height="h-4" rounded="rounded" />
            <div className="flex gap-2">
              <Skeleton width="w-10" height="h-10" rounded="rounded-full" />
              <div className="flex flex-col gap-1">
                <Skeleton width="w-24" height="h-4" rounded="rounded" />
                <Skeleton width="w-16" height="h-3" rounded="rounded" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton width="w-16" height="h-6" rounded="rounded" />
              <Skeleton width="w-16" height="h-6" rounded="rounded" />
            </div>
          </div>
        </div>
      ))}
    </section>
  );

  const renderPostsWithAds = () => {
    const postsWithAds = [];
    selectedPosts.forEach((post, index) => {
      postsWithAds.push(
        <CardOfPost
          key={post._id}
          id={post._id}
          slug={post.slug}
          imageUrl={getFirstImage(post.blocks)}
          title={post.title}
          author={post.author}
          createdAt={post.createdAt || "Just now"}
          commentsCount={commentCounts[post._id] ?? post.comments?.length ?? 0}
          viewsCount={post.views || 0}
          thumbnail={post.thumbnail}
          likesCount={post.likes?.length || 0}
          category={post.category} // 👈 just pass ID
          previewHTML={
            post.blocks?.find((block) => block.type === "paragraph")?.content ||
            "<p>No preview available</p>"
          }
          isSubscriberOnly={post.isSubscriberOnly}
          timeSpent={post.timeSpent || 0}
        />
      );

      if (getAdPositions.includes(index + 1)) {
        postsWithAds.push(
          <AdCard
            key={`ad-${index}`}
            adIndex={index}
            adContent="Sponsored Content"
            adImage="https://placehold.co/300x250?text=Ad+Content"
            postId={post._id}
          />
        );
      }
    });
    return postsWithAds;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <Sorted posts={filteredPosts} onSortChange={handleSortChange} />

      {loading && !customPosts && renderSkeletonGrid()}

      {error && (
        <div className="text-center py-6">
          <p className="text-red-500 text-sm">{error?.message || "Error loading posts."}</p>
        </div>
      )}

      {!loading && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 py-6">
            {selectedPosts.length > 0 ? (
              renderPostsWithAds()
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-400 text-sm">No posts found.</p>
              </div>
            )}
          </section>

          {totalPages > 1 && (
            <div className="flex justify-center py-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Postbox;
