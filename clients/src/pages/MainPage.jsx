import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import HeroSection from "../components/HeroSection";
import RightSideBox from "../components/RightSideBar/RightSideBox";
import TabbedPostSection from "../components/Tabs/TabbedPostSection";
import { Menu, X } from "lucide-react";

const MainPage = () => {
  const user = useSelector((state) => state.auth.user);
  const [showSidebar, setShowSidebar] = useState(true); // for large screens
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // for mobile screens

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      setShowSidebar((prev) => !prev);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileSidebarOpen(false); // close mobile sidebar
        setShowSidebar(true); // ensure desktop starts visible
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow =
      isMobileSidebarOpen && window.innerWidth < 1024 ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMobileSidebarOpen]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <HeroSection />

      <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-6 py-8">
        {/* Sidebar toggle button */}
        <div className="flex justify-end py-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-indigo-500 hover:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-md"
            aria-label="Toggle Sidebar"
          >
            {(window.innerWidth < 1024 ? isMobileSidebarOpen : showSidebar) ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="flex flex-row gap-2">
          <div className="flex-2">
            <TabbedPostSection user={user} />
          </div>

          {/* Sidebar */}
          {(showSidebar || isMobileSidebarOpen) && (
            <aside
              className={`fixed top-0 right-0 h-full min-w-[400px] sm:w-96 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-2xl z-50  overflow-y-auto transition-transform duration-300 ease-in-out
                ${isMobileSidebarOpen ? "translate-x-0" : "translate-x-full"}
                lg:static lg:translate-x-0 lg:z-auto lg:shadow-none lg:w-96`}
            >
              <RightSideBox
                user={user}
                toggleSidebar={toggleSidebar}
              />
            </aside>
          )}
        </div>
      </div>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/70 z-40 transition-opacity duration-300 lg:hidden ${
          isMobileSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleSidebar}
      />
    </div>
  );
};

export default MainPage;
