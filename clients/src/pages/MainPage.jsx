import React, { useState } from "react";
import HeroSection from "../components/HeroSection";
import RightSideBox from "../components/RightSideBox";
import Postbox from "../components/Post/Postbox";
import TabbedPostSection from "../components/Tabs/TabbedPostSection";

const MainPage = () => {
  const [activeTab, setActiveTab] = useState("all");

  const tabs = [
    { id: "all", label: "All Posts" },
    { id: "following", label: "Following" },
    { id: "my", label: "My Posts" },
  ];

  return (
    <div className="pt-28">
      <HeroSection />

      <div className="bg-background flex flex-row gap-4 px-4 md:px-20">
        {/* Left Content */}
        <div className="w-full md:w-[80%]">
          {/* Tabs */}
          <div className="mt-7">
            <TabbedPostSection />
        
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
