import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import SearchResults from "../components/SearchBar/SearchResults";
import { getSearchPosts } from "../store/postSlice";

const useQuery = () => {
  const params = new URLSearchParams(useLocation().search);
  return params;
};

const SearchPage = () => {
  const query = useQuery();
  const searchTerm = query.get("query") || "";
  const dispatch = useDispatch();
  const {
    searchPosts = [],
    searchLoading,
    searchError,
  } = useSelector((state) => state.post || {});

  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed && trimmed.length >= 2) {
      try {
        dispatch(getSearchPosts({ query: trimmed }));
      } catch (e) {
        console.error("[SearchPage] Fetch error:", e);
      }
    }
  }, [searchTerm, dispatch]);

  // Backend already handles strict filtering and scoring
  // No need to re-filter here - just use the posts as-is
  const filteredResults = searchPosts || [];

  return (
    <div className="min-h-screen px-4 py-6 max-w-7xl mx-auto bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          {searchTerm && searchTerm.trim().length >= 2 && (
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">
                Showing results for:{" "}
                <span className="text-indigo-600 dark:text-indigo-400">
                  "{searchTerm}"
                </span>
              </h2>
              <button
                onClick={() => (window.location.href = location.pathname)}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium transition-colors"
              >
                Clear Search
              </button>
            </div>
          )}

          {searchTerm && searchTerm.trim().length < 2 && (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Please enter at least 2 characters to search
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Minimum search length is 2 characters
              </p>
            </div>
          )}

          {searchLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-indigo-600 dark:text-indigo-400 font-medium">
                  Searching for exact matches...
                </p>
              </div>
            </div>
          )}

          {searchError && (
            <div className="text-center py-8">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-red-600 dark:text-red-400 font-semibold mb-2">
                  Search Error
                </p>
                <p className="text-red-500 dark:text-red-300 text-sm">
                  {searchError}
                </p>
              </div>
            </div>
          )}

          {!searchLoading &&
            !searchError &&
            filteredResults.length === 0 &&
            searchTerm.trim().length >= 2 && (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <svg
                    className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No exact matches found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">
                    No results found for "
                    <span className="font-medium">{searchTerm}</span>"
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-3">
                    Try these tips:
                  </p>
                  <ul className="text-sm text-gray-500 dark:text-gray-500 mt-2 space-y-1">
                    <li>• Check your spelling</li>
                    <li>• Use different keywords</li>
                    <li>• Try shorter or more general terms</li>
                    <li>• Search for tags instead of full titles</li>
                  </ul>
                </div>
              </div>
            )}

          {!searchLoading && !searchError && filteredResults.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Found{" "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {filteredResults.length}
                </span>{" "}
                exact {filteredResults.length === 1 ? "match" : "matches"}
              </p>
            </div>
          )}

          <SearchResults results={filteredResults} searchTerm={searchTerm} />
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
