// SinglePostView.jsx (added logs)
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { fetchPublicPostBySlug, trackGuestView } from "../../store/guestSlice";
import Skeleton from "../Ui/Skeleton";

const SinglePostView = () => {
  console.log("SinglePostView: Mounted/updated");
  const { slug } = useParams();
  const dispatch = useDispatch();
  const { singlePost, loading, error } = useSelector(
    (state) => state.guest || {}
  );
  console.log("SinglePostView: State", {
    slug,
    singlePost: !!singlePost,
    loading,
    error,
  });

  useEffect(() => {
    console.log("SinglePostView useEffect: Loading post for slug", slug);
    const loadPost = async () => {
      try {
        await dispatch(fetchPublicPostBySlug(slug)).unwrap();
        await dispatch(trackGuestView(slug)).unwrap();
        console.log("SinglePostView: Load complete");
      } catch (err) {
        console.error("Failed to fetch post:", err);
      }
    };
    loadPost();
  }, [dispatch, slug]);

  if (loading) {
    console.log("SinglePostView: Rendering loading");
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

  if (error) {
    console.log("SinglePostView: Rendering error", error);
    return (
      <div className="text-center text-red-500 py-4">
        {error}
        <button
          onClick={() => dispatch(fetchPublicPostBySlug(slug))}
          className="ml-2 text-blue-500 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!singlePost) {
    console.log("SinglePostView: Post not found");
    return (
      <div className="text-center text-gray-400 py-8">Post not found.</div>
    );
  }

  console.log("SinglePostView: Rendering post", singlePost.title);
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">{singlePost.title}</h1>
      <p className="text-gray-600 mb-4">{singlePost.excerpt}</p>
      {singlePost.thumbnail && (
        <img
          src={singlePost.thumbnail}
          alt={singlePost.title}
          className="w-full h-64 object-cover rounded-lg mb-4"
        />
      )}
      {Array.isArray(singlePost.blocks) &&
        singlePost.blocks.map((block, index) => (
          <div key={index}>
            {block.type === "text" && (
              <p>{block.content || block.value || ""}</p>
            )}
            {block.type === "image" && (
              <img
                src={block.content || block.src || ""}
                alt=""
                className="w-full rounded-lg"
              />
            )}
          </div>
        ))}

      <div className="mt-4 text-sm text-gray-500">
        By {singlePost.author?.name || "Unknown"} on{" "}
        {new Date(singlePost.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
};

export default SinglePostView;
