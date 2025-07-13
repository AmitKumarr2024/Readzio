import React from "react";
import { Link } from "react-router-dom";

export default function GoogleLoginPopup() {
  return (
    <div className="fixed top-26 right-4 z-50 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-300 dark:border-gray-600">
      <p className="mb-2 text-sm">Sign in to personalize your experience</p>
      <Link
        to={"/login"}
        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
      >
        Continue with Google
      </Link>
    </div>
  );
}
