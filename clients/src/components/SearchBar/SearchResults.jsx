import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getSearchPosts as fetchSearchPosts } from "../../store/postSlice";
import CardOfPost from "../Cards/CardOfPost";
import FiltersSidebar from "./FiltersSidebar";

export default function SearchResults({ searchTerm }) {
  const dispatch = useDispatch();

  const searchPosts = useSelector((state) => state.post?.searchPosts || []);
  const searchLoading = useSelector((state) => state.post?.searchLoading);
  const searchError = useSelector((state) => state.post?.searchError);

  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 10;

  // Filters state locally here
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

  // Fetch search posts on searchTerm change
  useEffect(() => {
    async function fetchPosts() {
      if (searchTerm && searchTerm.trim() !== "") {
        try {
          await dispatch(fetchSearchPosts(searchTerm)).unwrap();
          setCurrentPage(1);
        } catch (err) {
          console.error("Failed to fetch search posts:", err);
        }
      }
    }
    fetchPosts();
  }, [searchTerm, dispatch]);

  // Filter and sort posts according to filters
  const filteredSortedPosts = useMemo(() => {
    let filtered = searchPosts;

    if (category !== "All") {
      filtered = filtered.filter((post) => post.category === category);
    }

    if (sortBy === "Newest") {
      filtered = filtered.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === "Older") {
      filtered = filtered.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === "Popular") {
      filtered = filtered.slice().sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
    }

    return filtered;
  }, [searchPosts, category, sortBy]);

  // Paginate filtered and sorted results
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * resultsPerPage;
    return filteredSortedPosts.slice(start, start + resultsPerPage);
  }, [filteredSortedPosts, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredSortedPosts.length / resultsPerPage));

  return (
    <div className="flex gap-8 p-4">
      {/* Filters Sidebar */}
      <FiltersSidebar
        category={category}
        sortBy={sortBy}
        onCategoryChange={(val) => {
          setCategory(val);
          setCurrentPage(1); // reset page on filter change
        }}
        onSortChange={(val) => {
          setSortBy(val);
          setCurrentPage(1); // reset page on filter change
        }}
      />

      {/* Search Results List */}
      <main className="flex-grow max-w-4xl">
        {!searchTerm || searchTerm.trim() === "" ? (
          <p className="text-gray-500">Enter a search term</p>
        ) : searchLoading ? (
          <p className="text-blue-500">Loading...</p>
        ) : searchError ? (
          <p className="text-red-500">
            Error:{" "}
            {typeof searchError === "string"
              ? searchError
              : searchError?.message
              ? searchError.message
              : JSON.stringify(searchError) || "Something went wrong"}
          </p>
        ) : filteredSortedPosts.length === 0 ? (
          <p className="text-gray-500">Search not found. Try a different keyword.</p>
        ) : (
          <>
            <ul className="space-y-4">
              {paginatedResults.map((post) => (
                <li key={post._id}>
                  <CardOfPost
                    id={post._id}
                    slug={post.slug || post._id}
                    title={post.title}
                    thumbnail={post.thumbnail || post.imageUrl}
                    createdAt={post.createdAt}
                    commentsCount={post.commentsCount}
                    viewsCount={post.viewsCount}
                    likesCount={post.likesCount}
                    author={post.author}
                    previewHTML={post.previewHTML || post.content}
                    category={post.category}
                    width="max-w-4xl"
                    height="64"
                  />
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between mt-4 text-sm text-gray-700">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <div className="space-x-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
