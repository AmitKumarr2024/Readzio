import React from "react";
import { FiDownload, FiFile } from "react-icons/fi";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes

const FileBlock = ({ url, name, size }) => {
  // size expected in bytes
  if (size > MAX_FILE_SIZE) {
    return (
      <div className="my-6 p-4 max-w-md mx-auto bg-red-100 rounded-lg shadow-md flex items-center gap-4">
        <div className="text-red-500 text-4xl">
          <FiFile />
        </div>
        <div>
          <p className="font-semibold text-red-700 truncate">{name}</p>
          <p className="text-sm text-red-600">File too large to download (max 10MB)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-6 p-4 max-w-md mx-auto bg-white rounded-lg shadow-md flex items-center gap-4 hover:shadow-xl transition-shadow duration-300 cursor-pointer">
      <div className="text-blue-500 text-4xl">
        <FiFile />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-gray-800 truncate">{name}</p>
        <a
          href={url}
          download
          className="inline-flex items-center gap-2 mt-1 text-blue-600 hover:text-blue-800 font-medium"
          onClick={e => e.stopPropagation()}
        >
          <FiDownload />
          Download
        </a>
      </div>
    </div>
  );
};

export default FileBlock;
