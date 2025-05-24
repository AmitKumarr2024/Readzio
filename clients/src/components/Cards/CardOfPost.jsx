import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Eye } from "lucide-react";

// Utility to extract plain text from HTML
const getPlainTextSnippet = (html, wordCount = 5) => {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  const text = tempDiv.textContent || tempDiv.innerText || "";
  return text.split(" ").slice(0, wordCount).join(" ") + "...";
};

const CardOfPost = ({
  id,
  imageUrl,
  title,
  createdAt,
  commentsCount,
  viewsCount,
  author = { name: "John Doe", org: "TechPulse" },
  previewHTML = "<p>No preview available</p>",
}) => {
  const fallbackImage =
    "https://via.placeholder.com/400x240.png?text=No+Image";

  const preview = getPlainTextSnippet(previewHTML, 6);

  return (
    <Link
      to={`/post/${id}`}
      className="group w-full max-w-4xl mx-auto flex flex-col sm:flex-row bg-card-bg rounded-xl shadow border-2 border-gray-200 hover:shadow-lg transition duration-300"
    >
      {/* Thumbnail */}
      <div className="sm:w-1/4 w-full h-52 sm:h-auto overflow-hidden p-3">
        <img
          src={imageUrl || fallbackImage}
          alt={title}
          className="w-full h-full object-contain "
        />
      </div>

      {/* Text Content */}
      <div className="sm:w-4/5 w-full p-5 flex flex-col justify-between">
        {/* Author & Meta */}
        <div className="text-lg text-gray-600 mb-1">
          <span className="font-medium">{author.name}</span>
          <span className="text-gray-400 mx-1">·</span>
          <span>{author.org}</span>
        </div>

        {/* Title */}
        <h2 className="text-3xl line-clamp-1 font-serif font-semibold text-text-main leading-snug  ">
          {title}
        </h2>

        {/* Text Preview */}
        <p className="text-xl text-sub-text mt-2 line-clamp-2">{preview}</p>

        {/* Date & Stats */}
        <div className="flex items-center justify-between gap-4 mt-4 border-t pt-3 text-gray-500 text-lg">
          <div className="flex items-center gap-2">
            <MessageCircle size={16} /> {commentsCount}
          </div>
          <div className="flex items-center gap-2">
            <Eye size={16} /> {viewsCount}
          </div>
          <div className="text-xs text-gray-400 ml-auto">
            {new Date(createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CardOfPost;
