import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";

import FileBlock from "../PostFeature/FileBlock";
import ListBlock from "../PostFeature/ListBlock";
import VideoBlock from "../PostFeature/VideoBlock";
import { deletePost } from "../../store/postSlice";


const PostView = ({ post }) => {
  const dispatch = useDispatch();
  const { deleteLoading, deleteError, deleteMessage } = useSelector(
    (state) => state.post
  );

  if (!post || !post.title) {
    return (
      <div className="text-lg font-medium w-full text-center">
        <p className="text-gray-500">No post selected</p>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!post._id) return;
    if (window.confirm("Are you sure you want to delete this post?")) {
      await dispatch(deletePost(post._id));
    }
  };

  const renderBlock = (block, i) => {
    console.log("[DEBUG] Rendering block", i, block);

    switch (block.type) {
      case "text":
        return (
          <div
            key={i}
            className="leading-relaxed text-gray-800 text-base"
            dangerouslySetInnerHTML={{ __html: block.value }}
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
              <div className="text-xs text-gray-400 italic mt-1 px-4">
                {block.caption}
              </div>
            ) : (
              <div className="text-xs text-red-600 italic mt-1 px-4">
                [No caption provided]
              </div>
            )}
          </div>
        ) : null;
      case "code":
        return (
          <div
            key={i}
            className="relative bg-gray-800 rounded-lg overflow-hidden my-4"
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
              <div className="text-xs text-gray-400 italic mt-1 px-4 pb-3">
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
            className={`font-bold text-gray-900 my-4 ${
              block.level === 1
                ? "text-3xl"
                : block.level === 2
                ? "text-2xl"
                : "text-xl"
            }`}
          >
            {block.text}
          </Tag>
        );
      case "hr":
        return (
          <div key={i} className="my-6 text-center">
            <hr className="border-t-2 border-gray-200 w-3/4 mx-auto" />
            {block.caption && (
              <div className="mt-2 text-sm text-gray-500 italic">
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
              className="text-blue-600 hover:underline break-all font-medium"
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
            className="p-4 border border-gray-200 rounded-lg bg-gray-50 shadow-sm my-6"
          >
            <h4 className="font-semibold text-lg mb-2 text-gray-900">
              {block.question}
            </h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {(block.options || []).map((option, idx) => (
                <li key={idx}>{option}</li>
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
            className="border-l-4 border-blue-400 pl-4 italic text-gray-700 my-4 bg-gray-50 p-4 rounded-lg shadow-sm"
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
            <table className="min-w-full border border-gray-200 rounded-lg text-left">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((header, idx) => (
                    <th
                      key={idx}
                      className="border-b px-4 py-2 font-semibold text-gray-900"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="border-b px-4 py-2 text-gray-700"
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
        return (
          <VideoBlock key={i} src={block.src} caption={block.caption} />
        );
      default:
        console.warn(`[WARN] Unsupported block type: ${block.type}`);
        return (
          <div key={i} className="text-red-500 italic">
            Unsupported block type: {block.type}
          </div>
        );
    }
  };

  return (
    <div className="w-full p-6 font-sans text-gray-900">
      <section className="mb-6 bg-transparent">
        <h2 className="text-3xl font-bold text-center text-blue-700 mb-4">
          {post.title}
        </h2>

        {/* Delete Button */}
        <div className="my-6 flex flex-col items-center">
          <button
            onClick={handleDelete}
            disabled={deleteLoading}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {deleteLoading ? "Deleting..." : "Delete Post"}
          </button>
          {deleteError && <p className="text-red-500 mt-2">{deleteError}</p>}
          {deleteMessage && (
            <p className="text-green-600 mt-2">{deleteMessage}</p>
          )}
        </div>

        <hr className="border-gray-200 mb-4" />
        <div className="space-y-4">
          {post.blocks?.length > 0 ? (
            post.blocks.map((block, i) => renderBlock(block, i))
          ) : (
            <p className="text-gray-500 italic text-center">
              No content blocks available
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default PostView;
