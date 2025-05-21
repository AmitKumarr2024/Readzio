import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import RightSideBox from "../RightSideBox";

const DisplayPost = () => {
  const { id } = useParams();

  const demoPosts = [
    {
      id: "1",
      title: "React 19 Features You Should Know",
      imageUrl: "https://via.placeholder.com/800x400?text=React+19",
      createdAt: "2024-12-10",
      commentsCount: 12,
      viewsCount: 150,
      content: `React 19 brings a lot of improvements and new features such as improved server components, async rendering, and better development tools. 

      These improvements help developers build faster, more efficient, and scalable applications.

      ![React Screenshot](https://via.placeholder.com/700x300?text=React+Component+View)

      One major enhancement is the streaming server rendering, which helps pages load faster. Developers can also benefit from more consistent state management in concurrent mode.`,
    },
    {
      id: "2",
      title: "Top 10 Health Tips for Developers",
      imageUrl: "https://via.placeholder.com/800x400?text=Health+Tips",
      createdAt: "2025-01-05",
      commentsCount: 8,
      viewsCount: 230,
      content: `Staying healthy is important for developers. Tips include regular breaks, eye exercises, ergonomic seating, staying hydrated, and doing some physical activity daily.

      ![Break Reminder](https://via.placeholder.com/700x300?text=Take+a+Break)

      Even 5 minutes of walking or stretching every hour can greatly improve long-term health.`,
    },
  ];

  const [post, setPost] = useState(null);

  useEffect(() => {
    const foundPost = demoPosts.find((p) => p.id === id);
    setPost(foundPost);
  }, [id]);

  if (!post)
    return (
      <div className="p-6 text-center text-red-500 text-lg">
        Post not found.
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-36 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold leading-tight mb-4">{post.title}</h1>
          <div className="text-gray-500 text-sm mb-6">
            <span>🗓 {post.createdAt}</span> • <span>💬 {post.commentsCount} comments</span> • <span>👁 {post.viewsCount} views</span>
          </div>
          <img
            src={post.imageUrl}
            alt={post.title}
            className="rounded-xl shadow-md mb-8 w-full"
          />
          {post.content.split("\n").map((para, i) =>
            para.trim().startsWith("![") ? (
              <img
                key={i}
                src={para.match(/\((.*?)\)/)?.[1]}
                alt={para.match(/!\[(.*?)\]/)?.[1] || "post image"}
                className="rounded-lg shadow-md my-6"
              />
            ) : (
              <p key={i} className="text-gray-800 leading-relaxed text-lg">
                {para.trim()}
              </p>
            )
          )}
        </article>
      </div>
      <div className="lg:col-span-4">
        <RightSideBox />
      </div>
    </div>
  );
};

export default DisplayPost;
