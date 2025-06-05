import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Eye, Heart } from "lucide-react";
import TimeAgo from "../../Utils/TimeAgo";

// Utility to extract plain text from HTML
const getPlainTextSnippet = (html, wordCount = 5) => {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  const text = tempDiv.textContent || tempDiv.innerText || "";
  return text.split(" ").slice(0, wordCount).join(" ") + "...";
};

const CardOfPost = ({
  id,
  slug,
  imageUrl,
  title,
  createdAt,
  commentsCount,
  viewsCount,
  likesCount = 0,
  author = { name: "John Doe", org: "TechPulse" },
  previewHTML = "<p>No preview available</p>",
  width = "max-w-3xl",
  height="64",
  thumbnail,
  category
}) => {
  const fallbackImage = "https://via.placeholder.com/400x240.png?text=No+Image";

  const preview = getPlainTextSnippet(previewHTML, 12);

  return (
    <Link
      to={`/post/${slug}`}
      className={`mx-auto w-full ${width} h-${height} overflow-hidden rounded-xl bg-white shadow-md hover:shadow-lg transition duration-300 md:flex border`}
    >
      {/* Image Section */}
      <div className="md:shrink-0">
        <img
          className="h-36 w-full object-fit aspect-ratio:7/3 md:h-full md:w-48"
          src={thumbnail || fallbackImage}
          alt={title}
        />
      </div>

      {/* Text Section */}
      <div className="p-2 flex flex-col justify-between w-full">
        <div className="flex justify-between w-full">
          <div className="text-sm font-semibold tracking-wide text-indigo-500 uppercase mb-2">
            {author?.status || ""}
          </div>
          <div className="text-xs text-slate-500">
            <p className="font-bold">{author?.name || "Unknown Author"}</p>
            <p className="italic">Author</p>
          </div>
        </div>

        <h3 className="block text-lg capitalize leading-tight font-medium text-black hover:underline line-clamp-1">
          {title}
        </h3>

        <p className="mt-2 text-gray-500 text-sm line-clamp-2">{category}</p>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-gray-400 mt-4 text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <MessageCircle size={16} /> {commentsCount}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={16} /> {viewsCount}
            </span>
            <span className="flex items-center gap-1">
              <Heart size={16} className="text-red-500" /> {likesCount}
            </span>
          </div>
          <div className="ml-auto text-xs">
            <TimeAgo date={createdAt} />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CardOfPost;
