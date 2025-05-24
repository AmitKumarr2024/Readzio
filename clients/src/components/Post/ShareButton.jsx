import { useState } from "react";

export const ShareButton = ({ postUrl }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState("");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopySuccess("Link copied to clipboard!");
    } catch {
      setCopySuccess("Failed to copy the link.");
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
      >
        Share
      </button>

      {isModalOpen && (
        <div className="fixed  inset-0 bg-gray-800/75 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl relative">
            <h3 className="text-2xl text-center  font-bold mb-4 text-gray-900">Share This Post</h3>
            <p className="text-sm font-semibold text-gray-600 mb-4">Copy and share the post URL:</p>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={postUrl}
                readOnly
                className="flex-grow border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800"
              />
              <button
                onClick={handleCopy}
                className="bg-green-500 text-white font-semibold px-3 py-1.5 rounded hover:bg-green-600 transition"
              >
                Copy
              </button>
            </div>

            {copySuccess && <p className="text-green-600 text-sm mb-4">{copySuccess}</p>}

            <div className="text-top">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setCopySuccess("");
                }}
                className="w-full text-lg bg-red-600 font-bold text-white px-3 py-1.5 rounded hover:bg-red-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
