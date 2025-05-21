import React, { useState } from "react";

const TrendingPosts = () => {
  const posts = [
    "React 19 New Features",
    "AI Tools for Developers",
    "Best VS Code Extensions",
    "Next.js 14 Routing System",
    "CSS Tricks for 2025",
    "Node.js Performance Tips",
    "TypeScript Advanced Types",
    "Deploying with Vercel",
    "MongoDB Indexing Tips",
    "JWT Authentication Guide",
    "Bonus: Tailwind Dark Mode",
    "React Server Components Intro",
  ];

  const [showAll, setShowAll] = useState(false);

  const visiblePosts = showAll ? posts : posts.slice(0, 6);

  return (
    <div className="bg-white p-4 rounded-lg shadow-md w-full">
      <h2 className="text-lg flex font-semibold mb-2 border-b pb-1">
        🔥 Trending Posts
      </h2>

      <ul className="text-lg font-bold text-gray-700 list-disc pl-5 space-y-1">
        {visiblePosts.map((post, index) => (
          <li key={index}>{post}</li>
        ))}
      </ul>

      {posts.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-blue-600 text-sm underline hover:text-blue-800"
        >
          {showAll ? "View Less" : "View All"}
        </button>
      )}
    </div>
  );
};

export default TrendingPosts;
