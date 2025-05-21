import React from "react";
import { Link } from "react-router-dom";

const CardOfPost = ({
  id,
  imageUrl,
  title,
  createdAt,
  commentsCount,
  viewsCount,
}) => {

  
  return (
    <Link
      to={`/post/${id}`}
      className="flex justify-between flex-row-reverse w-full h-44 rounded-xl gap-1    overflow-hidden shadow-xl bg-gray-100 hover:shadow-lg transition-all"
    >
      {/* Image */}
      <div className="w-2/4 h-40  m-2 rounded-xl">
        <img
          src={imageUrl}
          alt={title}
          className="object-cover p-1 w-full h-[150px]"
        />
      </div>

      {/* Details fixed to bottom */}
      <div className="w-full p-4 mt-auto flex flex-col justify-between ">
        <div>
          <h2
            className="text-lg font-bold text-blue-700 hover:underline cursor-pointer mb-2 line-clamp-1 "
            title={title}
          >
            {title}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Published: {new Date(createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex justify-between text-xs text-gray-600 border-t pt-2">
          <span>🗨️ {commentsCount} Comments</span>
          <span>👁️ {viewsCount} Views</span>
        </div>
      </div>
    </Link>
  );
};

export default CardOfPost;
