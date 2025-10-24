import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { fetchPublicPostBySlug, trackGuestView } from "../../store/guestSlice";
import Skeleton from "../Ui/Skeleton";

const SinglePostView = () => {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const { singlePost, loading, error } = useSelector(
    (state) => state.guest || {}
  );

  useEffect(() => {
    console.log("🟦 [SinglePostView] useEffect triggered for slug:", slug);
    const loadPost = async () => {
      try {
        const result = await dispatch(fetchPublicPostBySlug(slug)).unwrap();
        console.log("🟩 [SinglePostView] Post fetch complete:", result);
        await dispatch(trackGuestView(slug)).unwrap();
      } catch (err) {
        console.error("🟥 [SinglePostView] Failed to fetch post:", err);
      }
    };
    loadPost();
  }, [dispatch, slug]);

  // Deep log after post data available
  useEffect(() => {
    if (singlePost) {
      console.group("🟨 [Post Data Debug]");
      console.log("Title:", singlePost.title);
      console.log("Thumbnail:", singlePost.thumbnail);
      console.log("Excerpt:", singlePost.excerpt);
      console.log("Blocks present:", Array.isArray(singlePost.blocks));
      if (Array.isArray(singlePost.blocks)) {
        console.log("Blocks length:", singlePost.blocks.length);
        singlePost.blocks.forEach((block, i) => {
          console.log(`  🧱 Block #${i}`, {
            type: block.type,
            data: block.data,
            content: block.content,
            value: block.value,
            src: block.src,
          });
        });
      }
      console.groupEnd();
    }
  }, [singlePost]);

  if (loading) {
    console.log("⏳ [SinglePostView] Rendering loading state");
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
    console.error("🟥 [SinglePostView] Error:", error);
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
    console.warn("⚠️ [SinglePostView] No post found for slug:", slug);
    return (
      <div className="text-center text-gray-400 py-8">Post not found.</div>
    );
  }

  console.log("✅ [SinglePostView] Rendering post:", singlePost.title);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">{singlePost.title}</h1>
      {singlePost.excerpt && (
        <p className="text-gray-600 mb-4">{singlePost.excerpt}</p>
      )}

      {singlePost.thumbnail && (
        <img
          src={singlePost.thumbnail}
          alt={singlePost.title}
          className="w-full h-64 object-cover rounded-lg mb-6"
        />
      )}

      {/* ✅ Render blocks */}
      {Array.isArray(singlePost.blocks) && singlePost.blocks.length > 0 ? (
        singlePost.blocks.map((block, index) => {
          const type = block.type || "";
          const data = block.data || {};
          console.log(`🔍 Rendering block #${index} | type: ${type}`, block);

          switch (type) {
            case "paragraph":
            case "text":
              console.log(`📝 Rendering paragraph block #${index}`, data.text);
              return (
                <p
                  key={index}
                  className="text-lg leading-relaxed mb-3"
                  dangerouslySetInnerHTML={{
                    __html: data.text || block.content || block.value || "",
                  }}
                />
              );

            case "header":
              const level = data.level || 2;
              const HeaderTag = `h${Math.min(level, 6)}`;
              console.log(`🔠 Rendering header block #${index}`, data.text);
              return (
                <HeaderTag key={index} className="font-semibold text-xl my-3">
                  {data.text}
                </HeaderTag>
              );

            case "image":
              const url =
                data.file?.url || data.url || block.content || block.src;
              console.log(`🖼️ Rendering image block #${index}`, url);
              return (
                <div key={index} className="my-4">
                  <img
                    src={url}
                    alt={data.caption || ""}
                    className="w-full rounded-lg"
                  />
                  {data.caption && (
                    <p className="text-sm text-gray-500 mt-1">{data.caption}</p>
                  )}
                </div>
              );

            case "list":
              console.log(`📋 Rendering list block #${index}`, data.items);
              return (
                <ul key={index} className="list-disc list-inside mb-3">
                  {Array.isArray(data.items) &&
                    data.items.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              );

            default:
              console.warn(`⚪ Unrecognized block type [${type}]`, block);
              return null;
          }
        })
      ) : (
        <p className="text-gray-500">No content available for this post.</p>
      )}

      <div className="mt-6 text-sm text-gray-500">
        By{" "}
        <span className="font-medium">
          {singlePost.author?.name || "Unknown"}
        </span>{" "}
        on {new Date(singlePost.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
};

export default SinglePostView;
