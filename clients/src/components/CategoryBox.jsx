import React from "react";
import { Link } from "react-router-dom";

const categories = [
    "Blogs",
  "Technology",
  "Health",
  "Travel",
  "Education",
  "Finance",
  "Lifestyle",
  "Food",
  "Sports",
];

const CategoryBox = () => {
  return (
    <div className="w-full bg-slate-100 py-3">
      <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-4">
        {categories.map((category) => (
          <Link to={`/category_page/${category}`}
            key={category}
            className="px-2 py-1 bg-yellow-400 text-black rounded-full hover:bg-yellow-300 transition"
          >
            {category}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CategoryBox;
