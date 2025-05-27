import React from "react";
import { useSelector } from "react-redux";
import HeroSection from "../components/HeroSection";
import RightSideBox from "../components/RightSideBox";
import TabbedPostSection from "../components/Tabs/TabbedPostSection";

const MainPage = () => {
  const user = useSelector((state) => state.auth.user);

  return (
    <div className="pt-28">
      <HeroSection />

      <div className="bg-background flex flex-row gap-4 px-4 md:px-20">
        {/* Left Content */}
        <div className="w-full md:w-[80%]">
          {/* Tabs */}
          <div className="mt-7">
            <TabbedPostSection user={user} />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="hidden md:block md:w-[35%]">
          <RightSideBox />
        </div>
      </div>
    </div>
  );
};

export default MainPage;
