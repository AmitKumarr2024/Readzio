import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, SkipForward } from "lucide-react";
import NewUserCategoryModal from "../components/Cards/NewUserCategoryModal";

const CategorySelectPage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    console.log("CategorySelectPage.jsx: Navigating back");
    navigate(-1);
  };

  const handleClose = () => {
    console.log("CategorySelectPage.jsx: Closing modal, navigating to home");
    navigate("/");
  };

  const handleSkip = () => {
    console.log("CategorySelectPage.jsx: Skipping category selection, navigating to home");
    navigate("/");
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 text-gray-900 dark:text-gray-100 flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Starry background with subtle animation */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 animate-pulse-slow"></div>

      {/* Header */}
      <header className="absolute top-4 sm:top-6 left-4 sm:left-6 right-4 sm:right-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all duration-300"
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
            Welcome to Blogly ✨
          </h1>
        </div>
        <button
          onClick={handleSkip}
          className="flex items-center gap-2 px-4 py-2 text-sm sm:text-base font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 rounded-lg hover:bg-indigo-100/50 dark:hover:bg-indigo-900/50 transition-all duration-300"
        >
          <SkipForward size={20} />
          Skip
        </button>
      </header>

      {/* Category Modal */}
      <div className="z-10 w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl">
        <NewUserCategoryModal onClose={handleClose} isNewUser={true} />
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-48 sm:h-48 bg-indigo-200/30 dark:bg-indigo-800/30 rounded-full blur-3xl -translate-x-1/4 translate-y-1/4"></div>
      <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-purple-200/30 dark:bg-purple-800/30 rounded-full blur-3xl translate-x-1/4 -translate-y-1/4"></div>
    </main>
  );
};

export default CategorySelectPage;

