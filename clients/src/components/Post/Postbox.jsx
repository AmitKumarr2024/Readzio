import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import CardOfPost from "../Cards/CardOfPost";
import Pagination from "../../Utils/Pagination";
import { getAllPosts } from "../../store/postSlice";
import Sorted from "../Tabs/Sorted";

const Postbox = ({ filterType, category, customPosts }) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.user.user);
  const {
    posts: storePosts,
    loading,
    error,
  } = useSelector((state) => state.post);

  const postsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const [sortedPosts, setSortedPosts] = useState([]);

  // Fetch posts only if customPosts is not provided
  useEffect(() => {
    if (!customPosts) {
      console.log("[Postbox] No customPosts provided, fetching all posts...");
      dispatch(getAllPosts());
    } else {
      console.log("[Postbox] Using customPosts passed from props");
    }
  }, [dispatch, customPosts]);

  // Memoize filteredPosts to prevent unnecessary recalculations
  const filteredPosts = useMemo(() => {
    const allPosts = customPosts || storePosts;
    console.log("[Postbox] Total posts loaded:", allPosts.length);

    return allPosts.filter((post) => {
      if (category && post.category !== category) {
        console.log(
          `[Postbox] Post ${post._id} filtered out by category: ${post.category}`
        );
        return false;
      }

      if (filterType === "My Posts") {
        const isMyPost = post.author?._id?.toString() === currentUser?.data?._id?.toString();
        console.log(`[Postbox] Post ${post._id} isMyPost? ${isMyPost}`);
        return isMyPost;
      }

      if (filterType === "Following") {
        const followingIds = currentUser?.data?.following || [];
        console.log("[Postbox] Following IDs:", followingIds);
        console.log(
          `[Postbox] Checking post ${post._id} authorId:`,
          post.author?._id
        );

        const postAuthorIdStr = post.author?._id?.toString();
        const isFollowingPost = followingIds.some(
          (id) => id.toString() === postAuthorIdStr
        );

        console.log(
          `[Postbox] Post ${post._id} is by followed author? ${isFollowingPost}`
        );
        return isFollowingPost;
      }

      return true; // No filter
    });
  }, [customPosts, storePosts, filterType, category, currentUser?.data]);

  // Initialize sortedPosts when filteredPosts changes
  useEffect(() => {
    console.log("[Postbox] Updating sortedPosts with filteredPosts");
    setSortedPosts(filteredPosts);
  }, [filteredPosts]);

  // Memoize handleSortChange to prevent unnecessary re-renders
  const handleSortChange = useCallback((sortedPosts, sortOption) => {
    console.log("[Postbox] handleSortChange called with:", sortedPosts, sortOption);
    setSortedPosts(sortedPosts);
    setCurrentPage(1);
  }, []);

  // Memoize selectedPosts for pagination
  const selectedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * postsPerPage;
    return sortedPosts.slice(startIndex, startIndex + postsPerPage);
  }, [sortedPosts, currentPage]);

  const totalPages = Math.ceil(sortedPosts.length / postsPerPage);

  const getFirstImageUrl = (blocks) => {
    const imageBlock = blocks?.find((block) => block.type === "image");
    return (
      imageBlock?.src || "https://via.placeholder.com/300x200?text=No+Image"
    );
  };

  console.log("[Postbox] Rendering component...");

  return (
    <div className="w-full">
      <Sorted posts={filteredPosts} onSortChange={handleSortChange} />

      {loading && !customPosts && <p>Loading posts...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {!loading && (
        <>
          <section className="w-full max-w-5xl flex flex-col items-center gap-4 p-4">
            {selectedPosts.length > 0 ? (
              selectedPosts.map((post, index) => (
                <CardOfPost
                  key={post._id || index}
                  id={post._id}
                  slug={post.slug}
                  imageUrl={getFirstImageUrl(post.blocks)}
                  title={post.title}
                  author={post?.author}
                  createdAt={post.createdAt || "Just now"}
                  commentsCount={post.comments?.length || 0}
                  viewsCount={post.views || 0}
                  thumbnail={post.thumbnail}
                  likesCount={post.likes?.length || 0}
                  category={post.category}
                />
              ))
            ) : (
              <p className="text-gray-400">No posts found.</p>
            )}
          </section>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Postbox;