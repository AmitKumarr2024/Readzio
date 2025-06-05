import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { useDispatch, useSelector } from "react-redux";
import { getSinglePost, getAllPosts } from "../../store/postSlice";
import BlockRenderer from "../PostFeature/BlockRenderer";
import LikeButton from "./LikeButton";
import ShareButton from "./ShareButton";
import BookmarkButton from "./BookmarkButton";
import CommentBox from "./CommentBox";
import CardOfPost from "../Cards/CardOfPost";
import TimeAgo from "../../Utils/TimeAgo";
import DeleteModal from "./DeleteModal";
import TotalView from "./TotalView";
import UserCardWrapper from "../Cards/usercard/UserCardWrapper";
import { Dialog } from "@headlessui/react";
import { X } from "lucide-react";

const DisplayPost = () => {
  const { slug } = useParams();
  const dispatch = useDispatch();

  const {
    currentPost: post,
    loading,
    error,
    posts: allPosts = [],
  } = useSelector((state) => state.post);

  const currentUser = useSelector((state) => state.auth.user);
  const allUsers = useSelector((state) => state.user.users) || [];

  const isAuthor = currentUser && post?.author?._id === currentUser._id;

  const accessiblePosts = allPosts.filter((p) => p?._id);

  const cardsToShow = 3;
  const [startIndex, setStartIndex] = useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const maxStartIndex = Math.max(0, accessiblePosts.length - cardsToShow);

  useEffect(() => {
    if (slug) dispatch(getSinglePost(slug));
  }, [dispatch, slug]);

  useEffect(() => {
    dispatch(getAllPosts());
  }, [dispatch]);

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
  if (!post) return <div className="p-6 text-center text-red-500">Post not found.</div>;

  const getUserById = (userId) => allUsers.find((u) => u._id === userId) || null;
  const firstImage = post.blocks?.find((b) => b.type === "image")?.src || "";
  const plainText =
    post.blocks
      ?.filter((b) => b.type === "text")
      .map((b) => b.content)
      .join(" ")
      .slice(0, 150)
      .replace(/(\s+\S*)$/, "") || "";

  return (
    <>
      <Helmet>
        <title>{post.title} | My Blog</title>
        <meta name="description" content={plainText} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={plainText} />
        <meta property="og:image" content={firstImage} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="bg-gray-100 min-h-screen py-4 px-4 overflow-x-hidden">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
          <div className="flex-1 min-w-0 bg-white shadow-md rounded-xl px-6 sm:px-10 py-10">
            <article className="prose prose-lg max-w-none mb-12 text-gray-800 leading-relaxed">
              <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight text-gray-900">
                {post.title}
              </h1>
              <div className="flex justify-between items-center text-sm text-gray-500 mt-2 mb-6 flex-wrap gap-3">
                <span>📁 {post.category}</span>
                <span>
                  👤{" "}
                  <Link
                    to={`/author-profile/${post.author._id}`}
                    className="text-gray-700 hover:underline"
                  >
                    {post.author.name || "Unknown author"}
                  </Link>
                </span>
                <TotalView postId={post._id} />
                <span>
                  <TimeAgo date={post.createdAt} />
                </span>
              </div>

              {isAuthor && (
                <div className="flex items-center gap-2 mb-6">
                  <Link
                    to={`/edit-post/${post._id}`}
                    className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                  >
                    Delete
                  </button>
                </div>
              )}

              <hr className="pb-10 text-slate-300" />

              <BlockRenderer
                blocks={post.blocks}
                postId={post._id}
                loginUser={currentUser}
                getUserById={getUserById}
              />
            </article>

            <div className="flex items-center gap-4 mb-8">
              <LikeButton postId={post._id} />
              <ShareButton postUrl={window.location.href} />
              <BookmarkButton postId={post._id} />
            </div>

            <CommentBox postId={post._id} />

            <section className="mt-12">
              <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
                More from My Blog
              </h2>
              <div className="overflow-hidden px-2 flex flex-wrap justify-between gap-6">
                {accessiblePosts.length > 0 ? (
                  accessiblePosts
                    .slice(startIndex, startIndex + cardsToShow)
                    .map((p) => (
                      <CardOfPost
                        width="max-w-3xl"
                        key={p._id || p.id}
                        id={p._id || p.id}
                        slug={p.slug}
                        title={p.title}
                        imageUrl={
                          p.blocks?.find((block) => block.type === "image")?.src ||
                          ""
                        }
                        createdAt={p.createdAt}
                        commentsCount={p.comments?.length || 0}
                        viewsCount={p.views || 0}
                        author={p.author || { name: "Unknown", org: "My Blog" }}
                        previewHTML={
                          p.blocks
                            ?.filter((block) => block.type === "text")
                            .map((block) => block.content)
                            .join(" ") || ""
                        }
                      />
                    ))
                ) : (
                  <p className="text-center text-gray-500">No posts available.</p>
                )}
              </div>
              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={() => setStartIndex((prev) => Math.max(0, prev - cardsToShow))}
                  disabled={startIndex === 0}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() =>
                    setStartIndex((prev) => Math.min(maxStartIndex, prev + cardsToShow))
                  }
                  disabled={startIndex >= maxStartIndex}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </section>
          </div>

          <div className="hidden md:block md:w-80">
            <UserCardWrapper userId={post.author?._id} />
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsUserModalOpen(true)}
        className="fixed top-30 right-2 z-50 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition md:hidden"
      >
        Author Info
      </button>

      <Dialog
        open={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        className="fixed inset-0 z-50 flex items-center justify-center md:hidden"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 relative z-50 mx-4">
          <button
            onClick={() => setIsUserModalOpen(false)}
            className="absolute top-1 right-1 font-bold text-red-500 hover:text-red-600"
          >
            <X className="w-8 h-8" />
          </button>
          <UserCardWrapper userId={post.author?._id} />
        </div>
      </Dialog>

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        postId={post._id}
      />
    </>
  );
};

export default DisplayPost;
