import React from "react";
import { Link } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";

export default function GoogleLoginPopup() {
  return (
    <div className="fixed top-24 right-4 z-50 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 shadow-xl rounded-xl p-4 flex items-center gap-3 hover:shadow-2xl transition-all duration-200">
      <FcGoogle className="text-2xl" />
      <div className="flex flex-col text-sm">
        <span className="font-medium text-gray-800 dark:text-white">
          Sign in with Google
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          For a personalized experience
        </span>
      </div>
      <Link
        to="/login"
        className="ml-3 text-sm font-semibold text-blue-600 hover:underline"
      >
        Sign in
      </Link>
    </div>
  );
}
