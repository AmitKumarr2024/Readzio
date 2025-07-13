import React, { useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import FiltersSidebar from "../components/SearchBar/FiltersSidebar";
import SearchResults from "../components/SearchBar/SearchResults";
import { getSearchPosts } from "../store/postSlice";

// Helper to get query param
const useQuery = () => {
  const params = new URLSearchParams(useLocation().search);
  console.log("[SearchPage] Query params:", { params: params.toString() });
  return params;
};

const SearchPage = () => {
  const location = useLocation();
  const query = useQuery();
  const searchTerm = query.get("query") || "";
  console.log("[SearchPage] Search term:", { searchTerm });

  const dispatch = useDispatch();
  const { searchPosts = [], searchLoading, searchError } = useSelector(
    (state) => {
      console.log("[SearchPage] Post state:", { postState: state.post });
      return state.post || {};
    }
  );

  // Fetch from server
  useEffect(() => {
    if (searchTerm.trim()) {
      console.log("[SearchPage] Dispatching getSearchPosts:", { query: searchTerm });
      dispatch(getSearchPosts({ query: searchTerm }));
    } else {
      console.log("[SearchPage] Search term empty, skipping fetch");
    }
  }, [searchTerm, dispatch]);

  // Merge and score results
  const filteredResults = useMemo(() => {
    console.log("[SearchPage] Computing filtered results:", { searchPostsCount: searchPosts.length, searchTerm });
    if (!searchTerm.trim()) {
      console.log("[SearchPage] No search term, returning empty results");
      return [];
    }

    const words = searchTerm.toLowerCase().split(/\s+/);
    console.log("[SearchPage] Search words:", { words });
    
    return searchPosts
      .map((item) => {
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
          console.log("[SearchPage] Scored item:", { itemId: item._id, title, score });
          return { item, score };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  }, [searchTerm, searchPosts]);

  return (
    <div className="min-h-screen px-4 py-6 max-w-7xl mx-auto bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          {searchTerm && (
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">
                Showing results for: <span className="text-indigo-600 dark:text-indigo-400">{searchTerm}</span>
              </h2>
              <button
                onClick={() => {
                  console.log("[SearchPage] Clearing search");
                  window.location.href = location.pathname;
                }}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
              >
                Clear Search
              </button>
            </div>
          )}
          {searchLoading && <p className="text-indigo-600 dark:text-indigo-400">Loading...</p>}
          {searchError && (
            <p className="text-red-600 dark:text-red-400">
              {console.log("[SearchPage] Search error:", { searchError })}
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