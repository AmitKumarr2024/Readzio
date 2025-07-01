import React from "react";
import { useNavigate } from "react-router-dom";
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
    <main className="relative min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 text-white flex items-center justify-center px-4">
      {/* Starry background */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>

      {/* Header */}
      <header className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
        <h1 className="text-2xl font-semibold text-white tracking-wide">
          Welcome to Blogly ✨
        </h1>
        <button
          onClick={handleSkip}
          className="text-sm text-gray-300 hover:text-white underline transition"
        >
          Skip
        </button>
      </header>

      {/* Category Modal */}
      <div className="z-10 max-w-xl w-full">
        <NewUserCategoryModal onClose={handleClose} isNewUser={true} />
      </div>
    </main>
  );
};

export default CategorySelectPage;