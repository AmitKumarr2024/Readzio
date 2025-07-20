import React, { useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import FiltersSidebar from "../components/SearchBar/FiltersSidebar";
import SearchResults from "../components/SearchBar/SearchResults";
import { getSearchPosts } from "../store/postSlice";

// Extracts query parameters from URL
const useQuery = () => {
  const params = new URLSearchParams(useLocation().search);
  return params;
};

// Displays search results for posts
const SearchPage = () => {
  const query = useQuery();
  const searchTerm = query.get("query") || "";
  const dispatch = useDispatch();
  const {
    searchPosts = [],
    searchLoading,
    searchError,
  } = useSelector((state) => state.post || {});

  // Fetch search results
  useEffect(() => {
    if (searchTerm.trim()) {
      try {
        dispatch(getSearchPosts({ query: searchTerm }));
      } catch (e) {
        console.error("[SearchPage] Fetch error:", e);
      }
    }
  }, [searchTerm, dispatch]);

  // Score and sort search results
  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const words = searchTerm.toLowerCase().split(/\s+/);
    return searchPosts
      .map((item) => {
        try {
          const title = item.title?.toLowerCase() || "";
          let matchCount = 0;
          let score = 0;
          words.forEach((word) => {
            const index = title.indexOf(word);
            if (index !== -1) {
              matchCount++;
              score += index === 0 ? 3 : 1;
            }
          });
          if (matchCount >= 1) {
            if (matchCount === words.length) score += 5;
            return { item, score };
          }
          return null;
        } catch (e) {
          console.error("[SearchPage] Scoring error:", e);
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  }, [searchTerm, searchPosts]);

  return (
    // Main layout with search results
    <div className="min-h-screen px-4 py-6 max-w-7xl mx-auto bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          {searchTerm && (
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">
                Showing results for:{" "}
                <span className="text-indigo-600 dark:text-indigo-400">
                  {searchTerm}
                </span>
              </h2>
              <button
                onClick={() => (window.location.href = location.pathname)}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
              >
                Clear Search
              </button>
            </div>
          )}
          {searchLoading && (
            <p className="text-indigo-600 dark:text-indigo-400">Loading...</p>
          )}
          {searchError && (
            <p className="text-red-600 dark:text-red-400">
              {console.error("[SearchPage] Search error:", searchError)}
              {searchError}
            </p>
          )}
          <SearchResults results={filteredResults} searchTerm={searchTerm} />
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
