import { useState } from "react";

const ShareButton = ({ postUrl }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState("");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopySuccess("Link copied successfully!");
      setTimeout(() => setCopySuccess(""), 2000);
    } catch {
      setCopySuccess("Failed to copy the link.");
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="modal-share px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
      >
        Share
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl relative mx-auto">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Share This Post</h3>
            <p className="text-sm font-semibold mb-4 text-gray-600">Copy and share the post URL:</p>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={postUrl}
                readOnly={true}
                className="flex-grow border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800"
              />
              <button
                onClick={handleCopy}
                className="modal-copy bg-green-500 text-white font-semibold px-4 py-2 rounded hover:bg-green-600 transition-colors"
              >
                Copy
              </button>
            </div>

            {copySuccess && <p className="text-green-600 text-sm mb-4">{copySuccess}</p>}

            <button
              onClick={() => {
                setIsModalOpen(false);
                setCopySuccess("");
              }}
              className="modal-close w-full bg-red-500 text-white font-semibold px-4 py-2 rounded hover:bg-red-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareButton;