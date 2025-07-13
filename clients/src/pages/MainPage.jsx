import React, { useEffect, useLayoutEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import HeroSection from "../components/HeroSection";
import RightSideBox from "../components/RightSideBar/RightSideBox";
import TabbedPostSection from "../components/Tabs/TabbedPostSection";
import { Menu, X } from "lucide-react";
import { toggleSidebar, setIsMobile } from "../store/Post/postMetaSlice";
import { fetchPublicPosts } from "../store/guestSlice";
import { getAllPosts } from "../store/postSlice";
import GuestPostView from "../components/mainScreen/GuestPostView";

const MainPage = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading: authLoading } = useSelector((state) => state.auth);
  const { posts: guestPosts = [], loading: guestLoading, error: guestError } = useSelector((state) => state.guest || {});
  const { posts: authPosts = [], loading: authPostLoading } = useSelector((state) => state.post || {});
  const { isSidebarOpen, isMobile } = useSelector((state) => state.postMeta);

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        dispatch(getAllPosts({ page: 1, limit: 12 }));
      } else {
        dispatch(fetchPublicPosts({ page: 1, limit: 12 }));
      }
    }
  }, [dispatch, isAuthenticated, authLoading]);

  useLayoutEffect(() => {
    const handleResize = () => {
      dispatch(setIsMobile(window.innerWidth < 1024));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [dispatch]);

  useEffect(() => {
    document.body.style.overflow = isMobile && isSidebarOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMobile, isSidebarOpen]);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      <HeroSection />
      <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-6 py-8">
        <div className="flex justify-end py-4">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-2 rounded-xl bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark hover:bg-indigo-500 hover:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-md"
            aria-label="Toggle Sidebar"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        <div className="flex flex-row gap-2">
          <div className="flex-2 w-full">
            {authLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : isAuthenticated ? (
              <TabbedPostSection user={user} posts={authPosts} loading={authPostLoading} />
            ) : (
              <GuestPostView posts={guestPosts} loading={guestLoading} />
            )}
          </div>
          {isSidebarOpen && (
            <aside
              className={`fixed top-0 right-0 h-full min-w-[300px] md:w-96 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-2xl z-50 overflow-y-auto transition-transform duration-300 ease-in-out
              ${isMobile ? "translate-x-0" : ""}
              lg:static lg:z-auto lg:shadow-none lg:w-96`}
            >
              <RightSideBox
                user={user}
                toggleSidebar={() => dispatch(toggleSidebar())}
              />
            </aside>
          )}
        </div>
        {!isAuthenticated && !authLoading && guestError && (
          <div className="text-center text-red-500 py-4">
            <p>{guestError}</p>
            <button
              onClick={() => dispatch(fetchPublicPosts({ page: 1, limit: 12 }))}
              className="ml-2 text-blue-500 underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>
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