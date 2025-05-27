import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import CommentBox from "./CommentBox";
import { LikeButton } from "./LikeButton";
import { ShareButton } from "./ShareButton";
import { BookmarkButton } from "./BookmarkButton";
import CardOfPostVertical from "../Cards/CardOfPostVertical";
import BlockRenderer from "../PostFeature/BlockRenderer";
import CreateShortProfile from "../RightSideBar/CreateShortProfile";

const DisplayPost = () => {
  const { id } = useParams();

  const [allPosts, setAllPosts] = useState([]);
  const [post, setPost] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    const storedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    setAllPosts(storedPosts);

    const index = storedPosts.findIndex((p) => p.id === id);
    if (index !== -1) {
      setPost(storedPosts[index]);
      setCurrentIndex(index);
    } else {
      setPost(null);
    }
  }, [id]);

  if (!post) {
    return (
      <div className="p-6 text-center text-red-500 text-lg">
        Post not found.
      </div>
    );
  }

  const cardsToShow = 3;
  const maxStartIndex = Math.max(allPosts.length - cardsToShow, 0);

  const goPrev = () => setStartIndex((prev) => Math.max(prev - 1, 0));
  const goNext = () =>
    setStartIndex((prev) => Math.min(prev + 1, maxStartIndex));

  // Extract first image and a short description from the blocks
  const firstImage =
    post.blocks?.find((block) => block.type === "image")?.src || "";
  const plainText = post.blocks
    ?.filter((block) => block.type === "text")
    .map((b) => b.content)
    .join(" ")
    .slice(0, 150);

  return (
    <>
      <Helmet>
        <title>{post.title} | My Blog</title>
        <meta
          name="description"
          content={plainText || "Read this post on My Blog."}
        />
        <meta property="og:title" content={post.title} />
        <meta
          property="og:description"
          content={plainText || "Check out this blog post."}
        />
        <meta property="og:image" content={firstImage} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 py-6 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-screen">
        <div className="lg:col-span-8">
          <article className="max-w-none mb-9 w-full overflow-auto">
            <h1 className="text-5xl capitalize font-bold leading-tight mb-4">
              {post.title}
            </h1>
            <div className="flex flex-row justify-between items-center mb-6">
              <div>
                <div className="text-gray-500 text-sm flex flex-wrap mr-4 gap-4 items-center">
                  <span>📁 Category: {post.category}</span>
                </div>
                <div className="text-gray-600 text-sm flex flex-wrap gap-4 items-center">
                  <span>
                    👤{" "}
                    {post.author ? (
                      <Link
                        to={`/profile/${post.author.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {post.author.name}
                      </Link>
                    ) : (
                      "Unknown author"
                    )}
                  </span>
                  <span>🕒 {new Date(post.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <Link
                to={`/edit-post/${post.id}`}
                className="px-6 py-2 rounded-xl text-text-main hover:text-secondary bg-primary hover:bg-primary-hover"
              >
                Edit Post
              </Link>
            </div>

            <BlockRenderer blocks={post.blocks} />
          </article>

          <hr className="mb-6 text-slate-300" />

          <div className="flex gap-6 items-center mb-6">
            <LikeButton />
            <ShareButton postUrl={window.location.href} />
            <BookmarkButton />
          </div>
          <hr className="text-gray-300" />
          <CommentBox />

          <div className="w-full px-1 py-2">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 text-center">
              Latest Posts
            </h2>

            <div className="flex justify-between items-center mb-4">
              <button
                onClick={goPrev}
                disabled={startIndex === 0}
                className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={goNext}
                disabled={startIndex >= maxStartIndex}
                className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>

            <div className="flex gap-6 px-4 overflow-hidden">
              {allPosts
                .slice(startIndex, startIndex + cardsToShow)
                .map((post) => (
                  <div
                    key={post.id}
                    className="w-full grid md:grid-cols-1 gap-2"
                  >
                    <CardOfPostVertical
                      {...post}
                      imageUrl={
                        post.blocks?.find((block) => block.type === "image")
                          ?.src || ""
                      }
                    />
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <CreateShortProfile/>
        </div>
      </div>
    </>
  );
};

export default DisplayPost;
