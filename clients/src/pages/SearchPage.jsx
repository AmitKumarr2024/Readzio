import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import FiltersSidebar from "../components/SearchBar/FiltersSidebar";
import SearchResults from "../components/SearchBar/SearchResults";

const mockResults = [
  "React Hooks Tutorial",
  "Understanding useEffect",
  "Full Stack Blog App",
  "SEO for Blogs",
  "Creating a Post Editor with Drag and Drop",
];

const useQuery = () => new URLSearchParams(useLocation().search);

const SearchPage = () => {
  const location = useLocation();
  const query = useQuery();
  const searchTerm = query.get("query") || "";

  const filtered = useMemo(() => {
    const words = searchTerm.trim().toLowerCase().split(/\s+/);
    if (words.length === 0 || !searchTerm.trim()) return [];

    return mockResults
      .map((item) => {
        const title = item.toLowerCase();

        // Count how many words match
        let matchCount = 0;
        let score = 0;

        words.forEach((word) => {
          const index = title.indexOf(word);
          if (index !== -1) {
            matchCount++;
            if (index === 0) score += 3;
            else score += 1;
          }
        });

        // Only keep results where at least 2 words matched
        if (matchCount >= 2) {
          // Bonus score if all words matched
          if (matchCount === words.length) score += 5;
          return { item, score };
        }

        return null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  }, [searchTerm]);

  return (
    <div className="min-h-screen px-4 py-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Results */}
        <div className="flex-1">
          {searchTerm && (
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg text-gray-700 font-medium">
                Showing results for:{" "}
                <span className="text-blue-600">{searchTerm}</span>
              </h2>
              <button
                onClick={() => (window.location.href = location.pathname)}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Clear Search
              </button>
            </div>
          )}
          <SearchResults results={filtered} searchTerm={searchTerm} />
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
