import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getSearchPosts } from "../../store/postSlice";
import { searchUsers } from "../../store/userSlice";
import CardOfPost from "../Cards/CardOfPost";
import FiltersSidebar from "./FiltersSidebar";

const SearchResults = ({ searchTerm }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const searchPosts = useSelector((state) => state.post?.searchPosts || []);
  const searchLoading = useSelector((state) => state.post?.searchLoading);
  const searchError = useSelector((state) => state.post?.searchError);
  const searchedUsers = useSelector((state) => state.user?.searchedUsers || []);
  const userSearchError = useSelector((state) => state.user?.searchError);

  const [currentPage, setCurrentPage] = useState(1);
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
  const resultsPerPage = 12;

  useEffect(() => {
    const trimmed = searchTerm?.trim();
    if (trimmed && trimmed.length >= 1) {
      dispatch(getSearchPosts({ query: trimmed }));
      dispatch(searchUsers(trimmed));
      setCurrentPage(1);
    }
  }, [searchTerm, dispatch]);

  const filteredSortedPosts = useMemo(() => {
    let filtered = searchPosts;
    if (category !== "All") {
      filtered = filtered.filter((post) => post.category === category);
    }
    if (sortBy === "Newest") {
      return [...filtered].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    } else if (sortBy === "Older") {
      return [...filtered].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
    } else if (sortBy === "Popular") {
      return [...filtered].sort(
        (a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)
      );
    }
    return filtered;
  }, [searchPosts, category, sortBy]);

  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * resultsPerPage;
    return filteredSortedPosts.slice(start, start + resultsPerPage);
  }, [filteredSortedPosts, currentPage]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSortedPosts.length / resultsPerPage)
  );

  return (
    <div className="w-full min-h-screen py-8 sm:px-6 lg:px-8 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
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
          {!searchTerm || searchTerm.trim().length < 1 ? (
            <p className="text-text-main-light dark:text-text-main-dark text-xl font-semibold text-center">
              Enter a search term
            </p>
          ) : searchLoading ? (
            <p className="text-indigo-600 dark:text-indigo-400 text-xl font-semibold text-center animate-pulse">
              Loading...
            </p>
          ) : searchError || userSearchError ? (
            <p className="text-red-600 dark:text-red-400 text-xl font-semibold text-center">
              Error: {searchError || userSearchError || "Something went wrong"}
            </p>
          ) : (
            <>
              {/* All matched users */}
              {searchedUsers.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold mb-4">Matching Users</h3>
                  <ul className="space-y-4">
                    {searchedUsers.map((user) => (
                      <li
                        key={user._id}
                        className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition"
                      >
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name || "User Avatar"}
                            className="w-20 h-20 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                            {(() => {
                              const name = user.name || "";
                              const parts = name.trim().split(" ");
                              if (parts.length >= 2) {
                                return parts[0][0] + parts[1][0]; // First + Last
                              } else if (parts.length === 1) {
                                return parts[0][0]; // Only first name part
                              } else {
                                return (user.email?.[0] || "U").toUpperCase(); // fallback to email
                              }
                            })()}
                          </div>
                        )}

                        <div className="flex-grow w-full">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <p className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                                {user.name}
                              </p>
                              <p className="text-lg text-indigo-500">
                                {user.email}
                              </p>
                              <p className="text-lg font-extrabold text-gray-500 dark:text-gray-400 mt-1">
                                {user.totalPosts} post
                                {user.totalPosts === 1 ? "" : "s"}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                navigate(`/author-profile/${user._id}`)
                              }
                              className="px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 text-sm transition"
                            >
                              View Profile
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Divider */}
              {(searchedUsers.length > 0 && filteredSortedPosts.length > 0) && (
                <hr className="my-6 border-t border-indigo-200 dark:border-indigo-700" />
              )}

              {/* Posts */}
              {filteredSortedPosts.length === 0 ? (
                <p className="text-text-main-light dark:text-text-main-dark text-xl font-semibold text-center">
                  No results found. Try a different keyword.
                </p>
              ) : (
                <>
                  <h3 className="text-lg font-bold mb-4">Matching Posts</h3>
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
                  <div className="flex items-center justify-between mt-8 text-sm text-text-main-light dark:text-text-main-dark">
                    <span className="font-semibold">
                      Page {currentPage} of {totalPages}
                    </span>
                    <div className="space-x-2">
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 dark:hover:bg-indigo-500 disabled:opacity-50 transition duration-300"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 dark:hover:bg-indigo-500 disabled:opacity-50 transition duration-300"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default SearchResults;