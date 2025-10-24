import React, { useEffect, useLayoutEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Menu, X } from "lucide-react";
import { toggleSidebar, setIsMobile } from "../store/Post/postMetaSlice";
import { getAllPosts } from "../store/postSlice";

import HeroSection from "../components/HeroSection";
import RightSideBox from "../components/RightSideBar/RightSideBox";
import TabbedPostSection from "../components/Tabs/TabbedPostSection";
import GuestPostView from "../components/GuestMainScreen/GuestPostView";
import Skeleton from "../components/Ui/Skeleton";

const MainPage = () => {
  const dispatch = useDispatch();

  // --- Auth state ---
  const authState = useSelector((state) => state.auth);
  const { isAuthenticated, user, loading: authLoading } = authState;

  console.log("Auth State:", authState);

  // --- Authenticated user's posts ---
  const postState = useSelector((state) => state.post || {});
  const { posts: authPosts = [], loading: authPostLoading } = postState;
  console.log("Post State:", postState);

  // --- Layout meta ---
  const postMeta = useSelector((state) => state.postMeta);
  const { isSidebarOpen, isMobile } = postMeta;
  console.log("Layout Meta:", postMeta);

  // --- Handle tab change ---
  const handleTabChange = useCallback((tab) => {
    console.log("Tab changed to:", tab);
  }, []);

  // --- Fetch posts for logged-in users only ---
  useEffect(() => {
    console.log("useEffect: Checking auth to fetch posts", {
      authLoading,
      isAuthenticated,
    });
    if (!authLoading && isAuthenticated) {
      console.log("Dispatching getAllPosts for authenticated user");
      dispatch(getAllPosts({ page: 1, limit: 12 }));
    }
  }, [dispatch, isAuthenticated, authLoading]);

  // --- Clear stale post data ---
  useEffect(() => {
    console.log(
      "useEffect: Clearing stale posts, isAuthenticated=",
      isAuthenticated
    );
    if (isAuthenticated) {
      dispatch({ type: "guest/clearGuestPosts" });
      console.log("Cleared guest posts");
    } else {
      dispatch({ type: "post/clearAllPosts" });
      console.log("Cleared authenticated posts");
    }
  }, [isAuthenticated, dispatch]);

  // --- Handle responsive layout ---
  useLayoutEffect(() => {
    let timeoutId;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const mobile = window.innerWidth < 1024;
        console.log("Resizing, isMobile=", mobile);
        dispatch(setIsMobile(mobile));
      }, 100);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, [dispatch]);

  // --- Lock scroll on mobile when sidebar is open ---
  useEffect(() => {
    console.log(
      "useEffect: Sidebar scroll lock, isSidebarOpen=",
      isSidebarOpen,
      "isMobile=",
      isMobile
    );
    if (isMobile && isSidebarOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "auto";
      document.body.style.position = "static";
      document.body.style.width = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
      document.body.style.position = "static";
      document.body.style.width = "auto";
    };
  }, [isMobile, isSidebarOpen]);

  console.log(`MainPage Rendering Mode: ${isAuthenticated ? "USER" : "GUEST"}`);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      <HeroSection />

      <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-6 py-4">
        <div className="flex justify-end py-2">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="sidebar-toggle-btn fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg 
             bg-background-light dark:bg-background-dark 
             text-text-main-light dark:text-text-main-dark 
             hover:bg-indigo-500 hover:text-white 
             transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Toggle Sidebar"
          >
            {isSidebarOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        <div className="flex flex-row gap-2">
          {/* Main Feed */}
          <div className="flex-2 w-full">
            {authLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} height="h-48" />
                ))}
              </div>
            ) : isAuthenticated ? (
              <TabbedPostSection
                user={user}
                posts={authPosts}
                loading={authPostLoading}
                onTabChange={handleTabChange}
              />
            ) : (
              <>
                <GuestPostView />
              </>
            )}
          </div>

          {/* Sidebar */}
          {isSidebarOpen && (
            <aside
              className={`fixed top-0 right-0 h-full min-w-[400px] md:w-96 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-2xl z-50 overflow-y-auto transition-transform duration-300 ease-in-out
              ${
                isMobile ? "translate-x-0" : ""
              } lg:static lg:z-auto lg:shadow-none lg:w-96`}
            >
              <RightSideBox
                user={user}
                toggleSidebar={() => dispatch(toggleSidebar())}
              />
            </aside>
          )}
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 transition-opacity duration-300"
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Close Sidebar"
        />
      )}
    </div>
  );
};

export default MainPage;
