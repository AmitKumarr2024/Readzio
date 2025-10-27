import React, { useMemo, useEffect } from "react";
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

  // Strict matching - only exact or near-exact matches
  const filteredResults = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];

    const queryLower = searchTerm.trim().toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    return searchPosts
      .map((item) => {
        try {
          const title = (item.title || "").toLowerCase();
          const excerpt = (item.excerpt || "").toLowerCase();
          const tags = (item.tags || []).map((tag) => tag.toLowerCase());

          let score = 0;

          // STRICT MATCHING RULES:

          // 1. Exact title match (highest priority)
          if (title === queryLower) {
            score = 10000;
          }
          // 2. Title starts with exact query
          else if (title.startsWith(queryLower)) {
            score = 5000;
          }
          // 3. Title contains exact query as phrase
          else if (title.includes(queryLower)) {
            // Calculate position score - earlier is better
            const position = title.indexOf(queryLower);
            score = 3000 - position;
          }
          // 4. All query words present in order in title
          else if (queryWords.length > 1) {
            let allWordsFound = true;
            let lastIndex = -1;

            for (const word of queryWords) {
              const wordIndex = title.indexOf(word, lastIndex + 1);
              if (wordIndex === -1 || wordIndex <= lastIndex) {
                allWordsFound = false;
                break;
              }
              lastIndex = wordIndex;
            }

            if (allWordsFound) {
              score = 1000;
            }
          }
          // 5. Exact tag match
          if (tags.includes(queryLower)) {
            score = Math.max(score, 2000);
          }
          // 6. Excerpt contains exact phrase (lower priority)
          if (score === 0 && excerpt.includes(queryLower)) {
            score = 500;
          }

          // Only return items with meaningful matches
          return score > 0 ? { item, score } : null;
        } catch (e) {
          console.error("[SearchPage] Scoring error:", e);
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // Limit to top 10 results
      .map(({ item }) => item);
  }, [searchTerm, searchPosts]);

  return (
    <div className="min-h-screen px-4 py-6 max-w-7xl mx-auto bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          {searchTerm && searchTerm.trim().length >= 2 && (
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

          {searchTerm && searchTerm.trim().length < 2 && (
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please enter at least 2 characters to search
            </p>
          )}

          {searchLoading && (
            <p className="text-indigo-600 dark:text-indigo-400">Loading...</p>
          )}

          {searchError && (
            <p className="text-red-600 dark:text-red-400">{searchError}</p>
          )}

          {!searchLoading &&
            filteredResults.length === 0 &&
            searchTerm.trim().length >= 2 && (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  No exact matches found for "{searchTerm}"
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Try using different keywords or check your spelling
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
