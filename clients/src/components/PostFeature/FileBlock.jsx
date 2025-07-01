import React from "react";
import { FiDownload, FiFile } from "react-icons/fi";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const FileBlock = ({ url, name, size }) => {
  if (size > MAX_FILE_SIZE) {
    return (
      <div className="my-4 p-4 max-w-md mx-auto bg-red-50 rounded-xl shadow-md flex items-center gap-3">
        <FiFile className="text-red-500 text-3xl" />
        <div>
          <p className="font-semibold text-red-700 truncate">{name}</p>
          <p className="text-sm text-red-600">File too large (max 10MB)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 p-4 max-w-md mx-auto bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-xl shadow-md flex items-center gap-3 hover:shadow-lg transition-shadow">
      <FiFile className="text-indigo-500 text-3xl" />
      <div className="flex-1">
        <p className="font-semibold text-gray-800 truncate">{name}</p>
        <a
          href={url}
          download
          className="flex items-center gap-1 mt-1 text-indigo-600 hover:text-indigo-800 font-medium"
        >
          <FiDownload />
          Download
        </a>
      </div>
    </div>
  );
};

export default FileBlock;