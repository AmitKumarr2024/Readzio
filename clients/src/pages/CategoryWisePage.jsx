import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Filter, X } from "lucide-react";
import Postbox from "../components/Post/Postbox";

// Displays posts filtered by category
const CategoryWisePage = () => {
  const { category } = useParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortOption, setSortOption] = useState("recent");
  const [filterTags, setFilterTags] = useState([]);

  const toggleFilter = () => setIsFilterOpen((prev) => !prev);

  const handleSortChange = (e) => {
    setSortOption(e.target.value);
  };

  const handleTagToggle = (tag) => {
    setFilterTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filterOptions = [
    { value: "recent", label: "Most Recent" },
    { value: "popular", label: "Most Popular" },
    { value: "trending", label: "Trending" },
  ];

  const sampleTags = ["Technology", "Innovation", "News", "Tips"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 text-gray-900 dark:text-gray-100 pt-20 pb-12 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-start capitalize mt-8 mb-10 tracking-tight">
          Explore{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            {category}
          </span>{" "}
          Posts
        </h1>
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Main content */}
          <div className="w-full lg:w-3/4">
            <Postbox category={category} />
          </div>
          {/* Filter sidebar */}
          <aside
            className={`w-full lg:w-1/4 space-y-6 transition-all duration-500 ease-in-out ${
              isFilterOpen
                ? "fixed inset-0 top-16 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl z-50 p-6 sm:p-8 overflow-y-auto max-h-[calc(100vh-4rem)]"
                : "hidden lg:block lg:sticky lg:top-20"
            }`}
          >
            <div className="lg:sticky lg:top-20">
              <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <Filter className="w-5 h-5 sm:w-6 sm:h-6" /> Filter Posts
                  </h2>
                  {isFilterOpen && (
                    <button
                      onClick={toggleFilter}
                      className="lg:hidden text-gray-500 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-all duration-300"
                      aria-label="Close filters"
                    >
                      <X className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>
                  )}
                </div>
                <div className="space-y-6">
                  {/* Sort options */}
                  <div>
                    <label className="block text-sm sm:text-base font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Sort By
                    </label>
                    <select
                      value={sortOption}
                      onChange={handleSortChange}
                      className="w-full p-3 sm:p-4 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm sm:text-base"
                    >
                      {filterOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Tag filters */}
                  <div>
                    <label className="block text-sm sm:text-base font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Filter by Tags
                    </label>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {sampleTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-sm sm:text-base font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                            filterTags.includes(tag)
                              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-700 dark:hover:text-indigo-300"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
          {/* Mobile filter toggle */}
          <button
            onClick={toggleFilter}
            className="lg:hidden fixed bottom-6 right-6 p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-110 z-40"
            aria-label="Toggle filters"
          >
            <Filter className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryWisePage;
