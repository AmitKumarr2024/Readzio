import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getSearchPosts } from "../../store/postSlice";
import CardOfPost from "../Cards/CardOfPost";
import FiltersSidebar from "./FiltersSidebar";

const SearchResults = ({ searchTerm }) => {
  const dispatch = useDispatch();
  const searchPosts = useSelector((state) => state.post?.searchPosts || []);
  const searchLoading = useSelector((state) => state.post?.searchLoading);
  const searchError = useSelector((state) => state.post?.searchError);
  const [currentPage, setCurrentPage] = useState(1);
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
  const resultsPerPage = 12; // Increased to align with 3x4 grid

  useEffect(() => {
    if (searchTerm?.trim().length >= 3) {
      dispatch(getSearchPosts({ query: searchTerm.trim() }));
      setCurrentPage(1);
    }
  }, [searchTerm, dispatch]);

  const filteredSortedPosts = useMemo(() => {
    let filtered = searchPosts;
    if (category !== "All") {
      filtered = filtered.filter((post) => post.category === category);
    }
    if (sortBy === "Newest") {
      return [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === "Older") {
      return [...filtered].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === "Popular") {
      return [...filtered].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
    }
    return filtered;
  }, [searchPosts, category, sortBy]);

  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * resultsPerPage;
    return filteredSortedPosts.slice(start, start + resultsPerPage);
  }, [filteredSortedPosts, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredSortedPosts.length / resultsPerPage));

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
        <FiltersSidebar
          category={category}
          sortBy={sortBy}
          onCategoryChange={(val) => {
            setCategory(val);
            setCurrentPage(1);
          }}
          onSortChange={(val) => {
            setSortBy(val);
            setCurrentPage(1);
          }}
          className="w-full lg:w-80 shrink-0"
        />
        <main className="flex-grow">
          {!searchTerm || searchTerm.trim().length < 3 ? (
            <p className="text-indigo-700 text-xl font-semibold text-center">Enter a search term (min 3 characters)</p>
          ) : searchLoading ? (
            <p className="text-indigo-600 text-xl font-semibold text-center animate-pulse">Loading...</p>
          ) : searchError ? (
            <p className="text-red-600 text-xl font-semibold text-center">
              Error: {typeof searchError === "string" ? searchError : searchError?.message || "Something went wrong"}
            </p>
          ) : filteredSortedPosts.length === 0 ? (
            <p className="text-indigo-700 text-xl font-semibold text-center">No results found. Try a different keyword.</p>
          ) : (
            <>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedResults.map((post, index) => (
                  <li
                    key={post._id}
                    className="transform transition-all duration-500 ease-out animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
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
                      className="h-full"
                    />
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between mt-8 text-sm text-indigo-700">
                <span className="font-semibold">Page {currentPage} of {totalPages}</span>
                <div className="space-x-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition duration-300"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition duration-300"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default SearchResults;