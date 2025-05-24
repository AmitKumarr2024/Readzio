import React, { useState, useMemo } from "react";
import { FaRegClock } from "react-icons/fa";
import { Link } from "react-router-dom";
import Pagination from "../../Utils/Pagination";

const SearchResults = ({ results = [], searchTerm = "" }) => {
  const hasSearched = searchTerm.trim().length > 0;
  const resultsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * resultsPerPage;
    const end = start + resultsPerPage;
    return results.slice(start, end);
  }, [results, currentPage]);

  const totalPages = Math.ceil(results.length / resultsPerPage);

  // Reset to page 1 when searchTerm or results change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <main className="flex-1 bg-white shadow rounded-xl p-6 max-w-full">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Search Results</h1>

      {!hasSearched ? (
        <p className="text-gray-500">Start typing in the search bar to see results.</p>
      ) : results.length === 0 ? (
        <p className="text-gray-500">No results found.</p>
      ) : (
        <>
          <div className="space-y-5">
            {paginatedResults.map((item, index) => (
              <Link
                to={`/post/${item}`}
                key={index}
                className="block p-5 border rounded-xl hover:shadow-md transition-all duration-200 bg-white"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <span className="text-xs bg-blue-100 text-blue-600 font-medium px-2 py-0.5 rounded-full inline-block w-fit whitespace-nowrap">
                    Category
                  </span>
                  <div className="flex items-center text-sm text-gray-500 gap-2">
                    <FaRegClock className="text-sm" />
                    <span>2 days ago • 5 min read</span>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-800 mb-2 hover:text-blue-600 transition-colors">
                  {typeof item === "string" ? item : `Result Title ${item}`}
                </h3>
                <p className="text-gray-600 text-sm">
                  {typeof item === "string"
                    ? `Brief description of "${item}"...`
                    : `Brief description of result ${item}...`}
                </p>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </main>
  );
};

export default SearchResults;
