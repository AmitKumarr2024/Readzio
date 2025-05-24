import React from "react";
import { Link } from "react-router-dom";
import Footer from "./Footer";
import TrendingPosts from "./Cards/TrendingPost";
import CreateShortProfile from "./RightSideBar/CreateShortProfile";

const RightSideBox = ({ size }) => {
  return (
    <div
      className={`hidden  md:grid md:grid-cols-1 gap-4 w-6/6 p-2  place-items-center mt-${size}`}
    >
      {/* Trending Post Section */}

      <CreateShortProfile />
      
      <TrendingPosts />

      {/* Advertisement Section */}
      <div className="bg-yellow-100 p-4 rounded-lg shadow-md flex items-center justify-center h-48 w-full">
        <div className="text-gray-600 text-center">
          <p className="font-semibold mb-2">📢 Advertisement</p>
          <div className="bg-yellow-300 w-full h-full rounded-md flex items-center justify-center">
            <span>Ad Space</span>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default RightSideBox;
