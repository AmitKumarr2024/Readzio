import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import FileBlock from "../PostFeature/FileBlock";
import ListBlock from "../PostFeature/ListBlock";
import VideoBlock from "../PostFeature/VideoBlock";

const PostPreviewList = ({
  allPosts,
  deletePost,
  createPost,
  currentDraftPost,
}) => {
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [copiedIndex, setCopiedIndex] = useState(null);
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

  const handleCopyCode = (code, i) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(i);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const renderBlock = (block, i) => {
    switch (block.type) {
      case "text":
        return (
          <div
            key={i}
            className="leading-relaxed text-gray-800"
            dangerouslySetInnerHTML={{ __html: block.value }}
          />
        );
      case "image":
        return block.src ? (
          <img
            key={i}
            src={block.src}
            alt={block.caption || "Image"}
            className="max-w-full rounded-xl shadow-md my-4"
            loading="lazy"
          />
        ) : null;
      case "code":
        return (
          <div
            key={i}
            className="relative bg-gray-900 rounded-xl overflow-hidden my-4"
          >
            {/* Copy button */}
            <button
              onClick={() => handleCopyCode(block.code, i)}
              className="absolute top-2 right-2 text-xs bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-600 transition select-none flex items-center gap-1"
              aria-label="Copy code"
            >
              {copiedIndex === i ? "Copied!" : "Copy"}
            </button>

            {/* Language label */}
            <div className="absolute top-2 left-2 text-xs bg-gray-700 text-white px-2 py-1 rounded select-none uppercase font-semibold">
              {block.language || "javascript"}
            </div>

            <SyntaxHighlighter
              language={block.language || "javascript"}
              style={tomorrow}
              customStyle={{
                margin: 0,
                padding: "1.25rem",
                fontSize: "0.875rem",
                backgroundColor: "#1a202c",
              }}
              wrapLongLines
              showLineNumbers
            >
              {block.code}
            </SyntaxHighlighter>

            {block.caption && (
              <div className="text-xs text-gray-400 italic mt-1 px-5 pb-3">
                {block.caption}
              </div>
            )}
          </div>
        );
     
      case "file":
        return <FileBlock key={i} url={block.url} name={block.name} />;
      case "heading":
        const Tag = `h${block.level || 2}`;
        return (
          <Tag
            key={i}
            className={`font-bold text-gray-800 my-4 ${
              block.level === 1
                ? "text-4xl"
                : block.level === 2
                ? "text-3xl"
                : "text-2xl"
            }`}
          >
            {block.text}
          </Tag>
        );
      case "hr":
        return (
          <div key={i} className="my-6 text-center">
            <hr className="border-t-2 border-gray-300 w-3/4 mx-auto" />
            {block.caption && (
              <div className="mt-2 text-sm text-gray-600 italic">
                {block.caption}
              </div>
            )}
          </div>
        );
      case "link":
        return (
          <div key={i} className="my-3">
            <a
              href={block.href || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all"
            >
              {block.text || block.href}
            </a>
            {block.caption && (
              <div className="text-xs text-gray-500 italic mt-1">
                {block.caption}
              </div>
            )}
          </div>
        );
      case "list":
        return (
          <ListBlock
            key={i}
            items={block.items || []}
            ordered={block.ordered || false}
          />
        );
      case "poll":
        return (
          <div
            key={i}
            className="p-4 border rounded-xl bg-yellow-50 shadow-inner my-6"
            aria-label="Poll"
          >
            <h4 className="font-semibold mb-2 text-gray-800">
              {block.question}
            </h4>
            <ul className="list-disc list-inside space-y-1">
              {(block.options || []).map((option, idx) => (
                <li key={idx} className="text-gray-700">
                  {option}
                </li>
              ))}
            </ul>
            {block.caption && (
              <div className="text-xs text-gray-500 italic mt-2">
                {block.caption}
              </div>
            )}
          </div>
        );
      case "quote":
        return (
          <blockquote
            key={i}
            className="border-l-4 border-gray-400 pl-4 italic text-gray-700 my-4 bg-gray-50 p-4 rounded-md shadow-sm"
          >
            <p className="mb-2">"{block.text}"</p>
            {block.author && (
              <footer className="text-sm text-gray-500 text-right">
                — {block.author}
              </footer>
            )}
          </blockquote>
        );
      case "table":
        const [headers = [], ...rows] = block.data || [];

        return (
          <div key={i} className="my-6 overflow-x-auto">
            <table className="min-w-full border border-gray-300 table-auto text-left">
              <thead className="bg-gray-100">
                <tr>
                  {headers.map((header, idx) => (
                    <th key={idx} className="border px-4 py-2 font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="border px-4 py-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "video":
        return (
          <VideoBlock
            key={i}
            src={block.src}
            caption={block.caption}
         
           
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full md:w-[40%] h-screen bg-white overflow-y-auto p-6 relative font-sans text-gray-900">
      <h2 className="text-3xl font-serif font-bold mb-8 border-b pb-3 text-gray-800">
        📚 Blog Posts
      </h2>

      {currentDraftPost?.title && currentDraftPost?.blocks?.length > 0 && (
        <section className="mb-8 p-5 bg-yellow-50 border border-yellow-300 rounded-xl shadow-sm">
          <h3 className="text-xl font-bold text-yellow-700 mb-2">
            📝 Live Draft Preview
          </h3>
          <h4 className="font-semibold text-lg mb-3">
            {currentDraftPost.title}
          </h4>
          <div className="space-y-4 mb-4">
            {currentDraftPost.blocks.map((block, i) => renderBlock(block, i))}
          </div>
        </section>
      )}

      <div className="grid gap-5">
        <AnimatePresence>
          {allPosts.map((post) => {
            const firstBlock = post.blocks.find((b) =>
              ["image", "text", "file", "heading"].includes(b.type)
            );

            return (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer overflow-hidden group"
                onClick={() => setSelectedPostId(post.id)}
              >
                {firstBlock?.type === "image" ? (
                  <img
                    src={firstBlock.src}
                    alt={firstBlock.caption || "Post Image"}
                    className="w-full h-44 object-cover rounded-t-2xl group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => (e.target.style.display = "none")}
                    loading="lazy"
                  />
                ) : firstBlock?.type === "text" ? (
                  <div
                    className="p-6 space-y-2"
                    dangerouslySetInnerHTML={{ __html: firstBlock.value }}
                  />
                ) : null}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <button
        onClick={createPost}
        className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md transition"
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

            <motion.div
              ref={modalRef}
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "top center",
              }}
              className="bg-white max-h-[90vh] overflow-y-auto p-10 rounded-3xl w-full max-w-4xl shadow-xl scroll-smooth"
            >
              <h2 className="text-4xl font-serif font-bold capitalize mb-8 select-none">
                {selectedPost.title}
              </h2>
              <div className="space-y-10">
                {selectedPost.blocks.map((block, i) => renderBlock(block, i))}
              </div>
            </motion.div>

            <div className="mt-6 flex gap-4 z-50 select-none">
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 0.1, 3))}
                className="px-5 py-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-700 font-semibold transition"
              >
                Zoom In +
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 0.1, 0.5))}
                className="px-5 py-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-700 font-semibold transition"
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
