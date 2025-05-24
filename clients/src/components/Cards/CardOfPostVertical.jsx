import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Eye } from "lucide-react";

const CardOfPostVertical = ({
  id,
  imageUrl,
  title,
  createdAt,
  commentsCount,
  viewsCount,
}) => {
  const fallbackImage = "https://via.placeholder.com/400x240.png?text=No+Image";

  return (
    <Link
      to={`/post/${id}`}
      className="w-64 max-w-sm rounded-xl overflow-hidden bg-white shadow-2xl hover:shadow-xl transition-all duration-300 my-2"
    >
      {/* Image on top */}
      <div className="w-64  overflow-hidden">
        <img
          src={imageUrl || fallbackImage}
          alt={title}
          className=" object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* Post details */}
      <div className="p-5 flex flex-col justify-between h-40">
        <div>
          <h2
            className="text-xl font-serif font-semibold text-blue-800 hover:underline cursor-pointer line-clamp-2"
            title={title}
          >
            {title}
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Published:{" "}
            {new Date(createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="flex justify-between items-center text-sm text-gray-600 border-t pt-3 mt-auto">
          <div className="flex items-center gap-1">
            <MessageCircle size={16} />
            <span>{commentsCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye size={16} />
            <span>{viewsCount}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CardOfPostVertical;
