import React, { useState, useEffect } from "react";
import { FiUpload } from "react-icons/fi";

const Banner = ({ bannerUrl, onBannerChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempBanner, setTempBanner] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false); // for click-to-zoom modal

  useEffect(() => {
    if (bannerUrl) {
      localStorage.setItem("authorBanner", bannerUrl);
    }
  }, [bannerUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempBanner(reader.result);
        setZoomLevel(1);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (tempBanner) {
      onBannerChange(tempBanner);
      localStorage.setItem("authorBanner", tempBanner);
    }
    setIsModalOpen(false);
    setTempBanner(null);
    setZoomLevel(1);
  };

  return (
    <>
      <div className="relative w-full h-48 sm:h-80 overflow-hidden rounded-t-xl shadow-md mt-20 group">
        <img
          src={bannerUrl}
          alt="Profile Banner"
          className="w-full h-full object-cover cursor-zoom-in"
          onClick={() => setIsPreviewOpen(true)} // open full-screen modal
        />
        <div className="absolute inset-0 bg-black/25" />
        <button
          onClick={() => setIsModalOpen(true)}
          className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition"
        >
          Edit Banner
        </button>
      </div>

      {/* Banner Zoom Modal */}
      {isPreviewOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          onClick={() => setIsPreviewOpen(false)} // close on outside click
        >
          <div
            className="relative max-w-6xl w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={bannerUrl}
              alt="Zoomed Banner"
              className="w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-4 right-6 text-white text-4xl font-bold hover:text-red-500"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Edit Banner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-800/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-7xl  w-full p-6 relative">
            <h2 className="text-xl font-semibold mb-4">Change Banner</h2>
            <div className="mb-4 h-[540px] overflow-hidden rounded-md border border-gray-300 flex items-center justify-center bg-gray-100">
              <img
                src={tempBanner || bannerUrl}
                alt="Banner Preview"
                className="transition-transform duration-300"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            </div>

            <label className="mb-4 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md cursor-pointer hover:bg-blue-700 transition duration-300">
              <FiUpload className="w-5 h-5 mr-2" />
              <span>Choose Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setTempBanner(null);
                  setZoomLevel(1);
                }}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!tempBanner}
                className={`px-4 py-2 rounded text-white ${
                  tempBanner
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-blue-300 cursor-not-allowed"
                } transition`}
              >
                Save
              </button>
            </div>
            <button
              onClick={() => {
                setIsModalOpen(false);
                setTempBanner(null);
                setZoomLevel(1);
              }}
              className="absolute top-2 right-3 text-gray-600 hover:text-gray-800 text-2xl font-bold"
              aria-label="Close modal"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Banner;
