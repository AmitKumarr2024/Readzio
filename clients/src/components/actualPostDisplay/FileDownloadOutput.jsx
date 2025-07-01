import React from "react";

const FileDownloadOutput = ({ url, name }) => {
  return (
    <div className="my-4 p-4 border flex items-center justify-between border-gray-300 rounded-lg bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-darkshadow-sm w-full hover:shadow-md transition-shadow duration-300">
      <p
        className="mb-3 font-semibold line-clamp-1 text-gray-800 truncate"
        title={name || "Unnamed File"}
      >
        📎 {name || "Unnamed File"}
      </p>
      <a
        href={url}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block  text-center bg-blue-600  dark:bg-background-dark text-text-main-light dark:text-text-main-dark font-semibold px-6 py-2 rounded-md hover:bg-blue-700 transition"
      >
        Download File
      </a>
    </div>
  );
};

export default FileDownloadOutput;
