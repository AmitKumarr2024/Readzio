import React from "react";
import { X, TrendingUp, UserCircle, Megaphone } from "lucide-react";
import TrendingPosts from "../Cards/TrendingPost";
import UserCardWrapper from "../Cards/usercard/UserCardWrapper";
import Footer from "../Footer";

const RightSideBox = ({ user, toggleSidebar }) => {
  return (
    <aside className="flex flex-col gap-6 p-2 h-full min-w-[400px] overflow-y-auto bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-l border-gray-200 dark:border-gray-800">

      {/* Mobile Close Button */}
      {toggleSidebar && (
        <div className="lg:hidden sticky top-0 right-20 z-50 flex justify-end mb-2">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* User Info */}
      <section className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <UserCircle className="w-4 h-4" />
          Author Info
        </div>
        {user?._id ? (
          <UserCardWrapper userId={user._id} />
        ) : (
          <p className="text-center text-gray-400 text-sm">No user data available</p>
        )}
      </section>

      {/* Trending Section */}
      <section className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <TrendingUp className="w-4 h-4 text-indigo-500" />
          Trending Posts
        </div>
        <TrendingPosts />
      </section>

      {/* Advertisement */}
      <section className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 rounded-xl p-4 text-center shadow-sm border border-yellow-300 dark:border-yellow-600">
        <div className="flex justify-center items-center gap-2 text-yellow-800 dark:text-yellow-200 font-semibold text-sm mb-2">
          <Megaphone className="w-4 h-4" />
          Sponsored
        </div>
        <div className="h-24 bg-yellow-300/30 dark:bg-yellow-700/30 rounded-md flex items-center justify-center">
          <span className="text-xs text-yellow-900 dark:text-yellow-100 font-medium">Promote Your Brand</span>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800">
        <Footer />
      </div>
    </aside>
  );
};

export default RightSideBox;
