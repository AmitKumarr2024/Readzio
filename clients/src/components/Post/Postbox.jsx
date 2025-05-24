import React, { useState, useEffect } from "react";
import CardOfPost from "../Cards/CardOfPost";
import Pagination from "../../Utils/Pagination";

const Postbox = ({ filterType,category }) => {
  const postsPerPage = 5;
  const [allPosts, setAllPosts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
  try {
    const storedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    let filtered = storedPosts;

    // Apply category filter if a category is selected
    if (category) {
      filtered = filtered.filter((post) => post.category === category);
    }

    // Apply filterType logic
    if (filterType === "Following") {
      filtered = filtered.filter((post) => post.followed === true); // Dummy logic
    } else if (filterType === "My Posts") {
      const currentUserId = "demoUser"; // Replace with real user ID logic
      filtered = filtered.filter((post) => post.authorId === currentUserId);
    }

    setAllPosts(filtered);
    setCurrentPage(1); // Reset to first page on filter change
  } catch (error) {
    console.error("Failed to load posts:", error);
  }
}, [filterType, category]);


  const totalPages = Math.ceil(allPosts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const selectedPosts = allPosts.slice(startIndex, startIndex + postsPerPage);

  const getFirstImageUrl = (blocks) => {
    const imageBlock = blocks?.find((block) => block.type === "image");
    return imageBlock?.src || "https://via.placeholder.com/300x200?text=No+Image";
  };

  return (
    <div className="w-full">
      <div className="flex items-center flex-col">
        <section className="w-full max-w-5xl flex flex-col items-center gap-4 p-4">
          {selectedPosts.length > 0 ? (
            selectedPosts.map((post, index) => (
              <CardOfPost
                key={index}
                id={post.id}
                imageUrl={getFirstImageUrl(post.blocks)}
                title={post.title}
                createdAt={post.createdAt || "Just now"}
                commentsCount={post.comments?.length || 0}
                viewsCount={post.views || 0}
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
            onPageChange={(page) => setCurrentPage(page)}
          />
        )}
      </div>
    </div>
  );
};

export default Postbox;
