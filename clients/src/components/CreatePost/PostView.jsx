import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import DOMPurify from "dompurify";
import FileBlock from "../PostFeature/FileBlock";
import VideoBlock from "../PostFeature/VideoBlock";
import { deletePost } from "../../store/postSlice";

const PostView = ({ post }) => {
  const dispatch = useDispatch();
  const { deleteLoading, deleteError, deleteMessage } = useSelector(
    (state) => state.post
  );

  console.log("[PostView] Rendering post:", post);

  if (!post || !post.title) {
    console.log("[PostView] No post or title available");
    return (
      <div className="text-lg font-medium w-full text-center text-text-main-light dark:text-text-main-dark">
        <p className="opacity-80">No post selected</p>
      </div>
    );
  }

  const handleDelete = async () => {
    console.log("[PostView] Deleting post with id:", post._id);
    if (!post._id) return;
    if (window.confirm("Are you sure you want to delete this post?")) {
      await dispatch(deletePost(post._id));
      console.log("[PostView] Delete dispatched for post id:", post._id);
    }
  };

  const renderBlock = (block, i) => {
    console.log("[PostView] Rendering block:", { index: i, block });

    switch (block.type) {
      case "text":
        console.log("[PostView] Text block HTML:", block.value);
        return (
          <div
            key={i}
            className="rich-content text-text-main-light dark:text-text-main-dark leading-relaxed text-base my-4"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(block.value || "Empty text"),
            }}
          />
        );
      case "image":
        return block.src ? (
          <div key={i} className="my-4">
            <img
              src={block.src}
              alt={block.caption || "Image"}
              className="max-w-full rounded-lg shadow-md"
              loading="lazy"
            />
            {block.caption ? (
              <div className="text-xs text-text-main-light dark:text-text-main-dark opacity-80 italic mt-1 px-4">
                {block.caption}
              </div>
            ) : (
              <div className="text-xs text-red-500 italic mt-1 px-4">
                [No caption provided]
              </div>
            )}
          </div>
        ) : null;
      case "code":
        return (
          <div
            key={i}
            className="relative bg-gray-800 dark:bg-gray-900 rounded-lg overflow-hidden my-4"
          >
            <div className="absolute bottom-0 right-1 text-xs bg-gray-600 text-white px-2 py-1 rounded uppercase font-semibold">
              {block.language || "javascript"}
            </div>
            <SyntaxHighlighter
              language={block.language || "javascript"}
              style={tomorrow}
              customStyle={{
                margin: 0,
                padding: "1.5rem 1rem 1rem",
                fontSize: "0.875rem",
                backgroundColor: "transparent",
              }}
              wrapLongLines
              showLineNumbers
            >
              {block.code}
            </SyntaxHighlighter>
            {block.caption && (
              <div className="text-xs text-text-main-light dark:text-text-main-dark opacity-80 italic mt-1 px-4 pb-3">
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
            className={`font-bold text-text-main-light dark:text-text-main-dark my-4 ${
              block.level === 1
                ? "text-2xl sm:text-3xl"
                : block.level === 2
                ? "text-xl sm:text-2xl"
                : "text-lg sm:text-xl"
            }`}
          >
            {block.text}
          </Tag>
        );
      case "hr":
        return (
          <div key={i} className="my-6 text-center">
            <hr className="border-t-2 border-gray-200 dark:border-gray-800 w-3/4 mx-auto" />
            {block.caption && (
              <div className="mt-2 text-sm text-text-main-light dark:text-text-main-dark opacity-80 italic">
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
              className="text-blue-600 dark:text-blue-400 hover:underline break-all font-medium"
            >
              {block.text || block.href}
            </a>
            {block.caption && (
              <div className="text-xs text-text-main-light dark:text-text-main-dark opacity-80 italic mt-1">
                {block.caption}
              </div>
            )}
          </div>
        );
      case "list":
        console.log("[PostView] List block data:", {
          block,
          items: block.items,
          ordered: block.ordered,
        });
        if (!block.items || !Array.isArray(block.items)) {
          console.warn("[PostView] Invalid list items:", block.items);
          return (
            <div key={i} className="my-4 text-red-500 italic">
              Invalid list data: {JSON.stringify(block.items)}
            </div>
          );
        }
        return (
          <div
            key={i}
            className="my-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4"
          >
            {block.ordered ? (
              <ol className="list-decimal list-inside space-y-1">
                {block.items.map((item, j) => (
                  <li key={j}>{item || "Empty item"}</li>
                ))}
              </ol>
            ) : (
              <ul className="list-disc list-inside space-y-1">
                {block.items.map((item, j) => (
                  <li key={j}>{item || "Empty item"}</li>
                ))}
              </ul>
            )}
          </div>
        );
      case "poll":
        return (
          <div
            key={i}
            className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-background-light dark:bg-background-dark shadow-sm my-6"
          >
            <h4 className="font-semibold text-lg mb-2 text-text-main-light dark:text-text-main-dark">
              {block.question}
            </h4>
            <ul className="list-disc list-inside space-y-1 text-text-main-light dark:text-text-main-dark">
              {(block.options || []).map((option, idx) => (
                <li key={idx}>{option}</li>
              ))}
            </ul>
            {block.caption && (
              <div className="text-xs text-text-main-light dark:text-text-main-dark opacity-80 italic mt-2">
                {block.caption}
              </div>
            )}
          </div>
        );
      case "quote":
        return (
          <blockquote
            key={i}
            className="border-l-4 border-blue-400 dark:border-blue-600 pl-4 italic text-text-main-light dark:text-text-main-dark my-4 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-sm"
          >
            <p className="mb-2">"{block.text}"</p>
            {block.author && (
              <footer className="text-sm text-text-main-light dark:text-text-main-dark opacity-80 text-right">
                — {block.author}
              </footer>
            )}
          </blockquote>
        );
      case "table":
        const [headers = [], ...rows] = block.data || [];
        return (
          <div key={i} className="my-6 overflow-x-auto">
            <table className="min-w-full border border-gray-200 dark:border-gray-800 rounded-lg text-left">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  {headers.map((header, idx) => (
                    <th
                      key={idx}
                      className="border-b px-4 py-2 font-semibold text-text-main-light dark:text-text-main-dark"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="border-b px-4 py-2 text-text-main-light dark:text-text-main-dark"
                      >
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
        return <VideoBlock key={i} src={block.src} caption={block.caption} />;
      default:
        console.warn(`[PostView] Unsupported block type: ${block.type}`);
        return (
          <div key={i} className="text-red-500 italic">
            Unsupported block type: ${block.type}
          </div>
        );
    }
  };

  return (
    <div className="w-full p-4 sm:p-6 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      <section className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-blue-600 dark:text-blue-400 mb-4">
          {post.title}
        </h2>

        <div className="my-6 flex flex-col items-center">
          <button
            onClick={handleDelete}
            disabled={deleteLoading}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50 transition"
          >
            {deleteLoading ? "Deleting..." : "Delete Post"}
          </button>
          {deleteError && <p className="text-red-500 mt-2">{deleteError}</p>}
          {deleteMessage && (
            <p className="text-green-500 mt-2">{deleteMessage}</p>
          )}
        </div>

        <hr className="border-gray-200 dark:border-gray-800 mb-4" />
        <div className="space-y-4">
          {post.blocks?.length > 0 ? (
            post.blocks.map((block, i) => renderBlock(block, i))
          ) : (
            <p className="text-text-main-light dark:text-text-main-dark opacity-80 italic text-center">
              No content blocks available
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default PostView;
