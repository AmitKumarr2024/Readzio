// SinglePostView.jsx
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { fetchPublicPostBySlug, trackGuestView } from "../../store/guestSlice";
import Skeleton from "../Ui/Skeleton";
import GuestLoginModal from "../components/GuestLoginModal";

const SinglePostView = () => {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const { singlePost, loading, error } = useSelector(
    (state) => state.guest || {}
  );

  useEffect(() => {
    const loadPost = async () => {
      try {
        console.log("[SinglePostView] Fetching post, slug:", slug);
        await dispatch(fetchPublicPostBySlug(slug)).unwrap();
        console.log("[SinglePostView] Tracking guest view, slug:", slug);
        await dispatch(trackGuestView(slug)).unwrap();
      } catch (err) {
        console.error("[SinglePostView] Error loading post:", err);
      }
    };
    loadPost();
  }, [dispatch, slug]);

  // Debug state
  console.log("[SinglePostView] State:", { singlePost, loading, error });

  if (loading) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <Skeleton height="h-8" width="w-3/4" className="mb-4" />
        <Skeleton height="h-4" width="w-1/2" className="mb-4" />
        <Skeleton height="h-64" rounded="rounded-lg" className="mb-4" />
        <Skeleton height="h-4" width="w-full" className="mb-2" />
        <Skeleton height="h-4" width="w-full" className="mb-2" />
        <Skeleton height="h-4" width="w-2/3" />
      </div>
    );
  }

  if (error && error !== "Too many guest visits, please try again later") {
    return (
      <div className="text-center text-red-500 py-4">
        {error}
        <button
          onClick={() => {
            console.log("[SinglePostView] Retrying fetch, slug:", slug);
            dispatch(fetchPublicPostBySlug(slug));
          }}
          className="ml-2 text-blue-500 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!singlePost) {
    return (
      <div className="text-center text-gray-400 py-8">Post not found.</div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <GuestLoginModal />
      <h1 className="text-3xl font-bold mb-4">{singlePost.title}</h1>
      <p className="text-gray-600 mb-4">{singlePost.excerpt}</p>
      {singlePost.thumbnail && (
        <img
          src={singlePost.thumbnail}
          alt={singlePost.title}
          className="w-full h-64 object-cover rounded-lg mb-4"
        />
      )}
      <div className="prose dark:prose-invert">
        {singlePost.blocks.map((block, index) => (
          <div key={index}>
            {block.type === "text" && <p>{block.content}</p>}
            {block.type === "image" && (
              <img src={block.content} alt="" className="w-full rounded-lg" />
            )}
            {/* Add more block types as needed */}
          </div>
        ))}
      </div>
      <div className="mt-4 text-sm text-gray-500">
        By {singlePost.author?.name || "Unknown"} on{" "}
        {new Date(singlePost.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
};

export default SinglePostView;
