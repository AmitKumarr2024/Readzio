import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import CodeBlock from "../Post/CodeBlock";

const PostPreviewList = ({
  allPosts,
  deletePost,
  createPost,
  currentDraftPost,
}) => {
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const modalRef = useRef(null);

  const selectedPost = allPosts.find((post) => post.id === selectedPostId);

  useEffect(() => {
    if (modalRef.current) {
      requestAnimationFrame(() => {
        modalRef.current.scrollTop = modalRef.current.scrollHeight;
      });
    }
    setZoomLevel(1);
  }, [selectedPostId]);

  useEffect(() => {
    if (allPosts.length > 0) {
      localStorage.setItem("posts", JSON.stringify(allPosts));
    }
  }, [allPosts]);

  const closeModal = () => {
    setSelectedPostId(null);
    setZoomLevel(1);
  };

  return (
    <div className="w-full md:w-[40%] h-screen bg-white overflow-y-auto p-6 relative font-sans text-gray-900">
      <h2 className="text-3xl font-serif font-semibold mb-8 border-b border-gray-300 pb-3 select-none">
        📚 Blog Posts
      </h2>

      {currentDraftPost &&
        currentDraftPost.title &&
        currentDraftPost.blocks.length > 0 && (
          <section className="mb-8 p-5 bg-yellow-50 border border-yellow-300 rounded-lg font-serif">
            <h3 className="text-xl font-semibold mb-2 text-yellow-700 select-none">
              📝 Live Draft Preview
            </h3>
            <h4 className="font-bold text-lg mb-3">{currentDraftPost.title}</h4>
            <div className="space-y-4">
              {currentDraftPost.blocks.map((block, i) => (
                <div key={i}>
                  {block.type === "text" && (
                    <div
                      className="leading-relaxed text-gray-800"
                      dangerouslySetInnerHTML={{ __html: block.value }}
                    />
                  )}
                  {block.type === "image" && block.src && (
                    <img
                      src={block.src}
                      alt={block.caption || "Draft image"}
                      className="max-w-full rounded-md shadow-sm"
                      loading="lazy"
                    />
                  )}
                  {block.type === "code" && (
                    <CodeBlock
                      code={block.code}
                      language="javascript" // or dynamically set if you have info
                      caption={block.caption}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

      <div className="grid gap-5">
        <AnimatePresence>
          {allPosts.map((post) => {
            // Find first code block for preview
            const codeBlock = post.blocks.find((b) => b.type === "code");
            // Fallback: first image or text block
            const firstBlock = post.blocks.find(
              (b) => b.type === "image" || b.type === "text"
            );

            return (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer overflow-hidden group relative"
                onClick={() => setSelectedPostId(post.id)}
              >
                {codeBlock ? (
                  <CodeBlock
                    code={codeBlock.code}
                    language="javascript"
                    caption={codeBlock.caption}
                  />
                ) : (
                  <>
                    {firstBlock?.type === "image" && firstBlock.src && (
                      <img
                        src={firstBlock.src}
                        alt={firstBlock.caption || "Post Image"}
                        className="w-full h-44 object-cover rounded-t-2xl group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => (e.target.style.display = "none")}
                        loading="lazy"
                      />
                    )}
                    {firstBlock?.type === "text" && (
                      <div
                        className="p-6 space-y-2"
                        dangerouslySetInnerHTML={{ __html: firstBlock.value }}
                      />
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <button
        onClick={createPost}
        className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md transition focus:outline-none focus:ring-2 focus:ring-blue-400 select-none"
      >
        ✅ Create Post
      </button>

      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50 p-4"
          >
            <button
              onClick={closeModal}
              className="self-end mb-4 text-white text-4xl font-bold hover:text-red-600 select-none"
              aria-label="Close modal"
            >
              &times;
            </button>

            {/* Scroll container with zoom */}
            <motion.div
              ref={modalRef}
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "top center",
              }}
              className="bg-white max-h-[90vh] overflow-y-auto p-10 rounded-3xl w-full max-w-4xl shadow-xl scroll-smooth"
            >
              <div>
                <h2 className="text-4xl font-serif font-bold capitalize mb-8 select-none">
                  {selectedPost.title}
                </h2>

                <div className="space-y-10">
                  {selectedPost.blocks.map((block, i) => (
                    <div key={i}>
                      {block.type === "text" && (
                        <div
                          className="text-gray-800 text-base leading-relaxed font-serif"
                          dangerouslySetInnerHTML={{ __html: block.value }}
                        />
                      )}

                      {block.type === "image" && block.src && (
                        <figure className="mx-auto max-w-full">
                          <img
                            src={block.src}
                            alt={block.caption || "Image"}
                            className="object-cover rounded-xl shadow-md max-h-96 mx-auto"
                            loading="lazy"
                          />
                          {block.caption && (
                            <figcaption className="text-center text-sm text-gray-500 italic mt-2 select-none">
                              {block.caption}
                            </figcaption>
                          )}
                        </figure>
                      )}

                      {block.type === "code" && (
                        <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-inner my-4">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(block.code);
                              setCopiedIndex(i);
                              setTimeout(() => setCopiedIndex(null), 2000);
                            }}
                            className="absolute top-2 right-2 text-xs bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-600 transition select-none"
                            aria-label="Copy code"
                          >
                            {copiedIndex === i ? "Copied!" : "Copy"}
                          </button>
                          <SyntaxHighlighter
                            language="javascript" // change dynamically if you want based on block metadata
                            style={tomorrow}
                            customStyle={{
                              margin: 0,
                              padding: "1.25rem",
                              fontSize: "0.875rem",
                              borderRadius: "0.75rem",
                              overflowX: "auto",
                              backgroundColor: "#1a202c", // matches your bg-gray-900
                            }}
                            wrapLongLines={true}
                            showLineNumbers={true}
                          >
                            {block.code}
                          </SyntaxHighlighter>
                          {block.caption && (
                            <div className="text-xs text-gray-400 italic mt-1 px-5 pb-3 select-none">
                              {block.caption}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Zoom controls */}
            <div className="mt-6 flex gap-4 z-50 select-none">
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 0.1, 3))}
                className="px-5 py-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-700 font-semibold transition"
                aria-label="Zoom In"
              >
                Zoom In +
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 0.1, 0.5))}
                className="px-5 py-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-700 font-semibold transition"
                aria-label="Zoom Out"
              >
                Zoom Out -
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PostPreviewList;
