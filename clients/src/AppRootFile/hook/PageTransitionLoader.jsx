// components/Loaders/PageTransitionLoader.jsx
import React from "react";
import { HashLoader } from "react-spinners";

export default function PageTransitionLoader({ isLoading }) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background-light dark:bg-background-dark bg-opacity-75 z-50">
      <HashLoader color="#f30000" size={40} speedMultiplier={1} />
    </div>
  );
}
