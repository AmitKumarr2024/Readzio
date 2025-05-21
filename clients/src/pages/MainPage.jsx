import React from "react";
import HeroSection from "../components/HeroSection";

import Postbox from "../components/Postbox";
import RightSideBox from "../components/RightSideBox";

const MainPage = () => {
  return (
    <div className="pt-28 ">
      
      <HeroSection />
      <div className="  flex flex-row    gap-4 px-20 ">
        <div className="w-full md:w-[80%]">
          <h2 className="text-2xl text-start ml-20 font-bold my-4 border-b-2  ">All Posts</h2>
          <Postbox />
        </div>

        <div className="hidden md:block md:w-[35%]">
          <RightSideBox size={16} />
        </div>
      </div>
    </div>
  );
};

export default MainPage;
