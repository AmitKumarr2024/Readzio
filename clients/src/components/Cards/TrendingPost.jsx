import React, { useState } from "react";

const TrendingPosts = () => {
  // Now each post has a title and a url
  const posts = [
    { title: "React 19 New Features", url: "/posts/react-19-new-features" },
    { title: "AI Tools for Developers", url: "/posts/ai-tools-for-developers" },
    { title: "Best VS Code Extensions", url: "/posts/best-vs-code-extensions" },
    { title: "Next.js 14 Routing System", url: "/posts/nextjs-14-routing-system" },
    { title: "CSS Tricks for 2025", url: "/posts/css-tricks-for-2025" },
    { title: "Node.js Performance Tips", url: "/posts/nodejs-performance-tips" },
    { title: "TypeScript Advanced Types", url: "/posts/typescript-advanced-types" },
    { title: "Deploying with Vercel", url: "/posts/deploying-with-vercel" },
    { title: "MongoDB Indexing Tips", url: "/posts/mongodb-indexing-tips" },
    { title: "JWT Authentication Guide", url: "/posts/jwt-authentication-guide" },
    { title: "Bonus: Tailwind Dark Mode", url: "/posts/tailwind-dark-mode" },
    { title: "React Server Components Intro", url: "/posts/react-server-components-intro" },
  ];

  const [showAll, setShowAll] = useState(false);
  const visiblePosts = showAll ? posts : posts.slice(0, 6);

  return (
    <div className="bg-white p-4 rounded-lg shadow-md w-full">
      <h2 className="text-lg flex font-semibold mb-2 border-b pb-1">
        🔥 Trending Posts
      </h2>

      <ul className="text-lg font-bold text-gray-700 list-disc pl-5 space-y-1">
        {visiblePosts.map(({ title, url }, index) => (
          <li key={index}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 underline"
            >
              {title}
            </a>
          </li>
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
