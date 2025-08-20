import React, { useState } from "react";
import { ZoomIn } from "lucide-react";
import { X } from "lucide-react";

const ImageBlockOutput = ({ src, caption }) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <figure className="my-6 relative">
      <img
        src={src}
        alt={caption || "Image"}
        className="rounded-lg shadow-md max-h-[550px] aspect-video object-cover max-w-[500px]"
      />
      {caption && (
        <figcaption className="text-sm text-start text-text-main-light dark:text-text-main-dark mt-2">
          {caption}
        </figcaption>
      )}

      {/* Zoom Button */}
      <button
        onClick={() => setModalOpen(true)}
        title="View Image"
        className="absolute bottom-2 right-2 bg-white dark:bg-gray-800 p-2 rounded-full border border-gray-300 dark:border-gray-600 shadow hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
      >
        <ZoomIn size={18} />
      </button>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4 sm:px-6"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-2 sm:p-4 rounded-lg shadow-xl max-w-[90vw] w-full max-h-[90vh] flex justify-center items-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
              title="Close"
            >
              <X size={22} />
            </button>

            {/* Image */}
            <img
              src={src}
              alt="Full"
              className="object-contain max-h-[90vh] max-w-[90vw] w-auto h-auto select-none"
              draggable={false}
            />
          </div>
        </div>
      )}
    </figure>
  );
};

export default ImageBlockOutput;
