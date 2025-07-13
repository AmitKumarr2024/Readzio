import React from "react";

const AdBlockWarning = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-red-500/90 text-white flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4 text-shadow-lg/50">🚫 Ad Blocker Detected</h1>
        <p className="text-lg text-shadow-lg/50">
          Please disable your ad blocker to access the full content and support our platform.
        </p>
      </div>
    </div>
  );
};

export default AdBlockWarning;
