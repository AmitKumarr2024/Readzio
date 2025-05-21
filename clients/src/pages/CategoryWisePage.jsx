import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CardOfPost from "../components/Cards/CardOfPost";
import HorizontalBar from "../components/HorizentalBar";
import Postbox from "../components/Postbox";
import RightSideBox from "../components/RightSideBox";

const CategoryWisePage = () => {
  const { category } = useParams();
  const [posts, setPosts] = useState([]);

  return (
    <div className="  px-auto py-6 w-full  mt-28">
      <h1 className="text-5xl font-bold text-center capitalize my-4 mx-auto container">
        Posts in <span className="text-orange-600">{category}</span>
      </h1>
      {posts.length > 0 ? (
        <p className="text-center">No posts found in this category.</p>
      ) : (
        <div className="  flex flex-row    gap-4 px-20 ">
          <div className="w-full md:w-[80%]">
            <HorizontalBar />
            <Postbox />
          </div>

          <div className="hidden md:block md:w-[35%]">
            <RightSideBox size={16} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryWisePage;
