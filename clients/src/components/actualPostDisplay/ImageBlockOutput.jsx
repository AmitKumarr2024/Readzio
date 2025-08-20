import React, { useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn } from "lucide-react";
import { X } from "lucide-react";

const ImageBlockOutput = ({ src, caption }) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <figure className="my-6 relative">
      <img
        src={src}
        alt={caption || "Image"}
        className="rounded-lg shadow-md max-h-[550px] aspect-video object-contain w-full"
      />
      {caption && (
        <figcaption className="text-sm text-center text-text-main-light dark:text-text-main-dark mt-2">
          {caption}
        </figcaption>
      )}

      {/* Zoom Button (icon only) */}
      <button
        onClick={() => setModalOpen(true)}
        title="Zoom"
        className="absolute bottom-2 right-2 bg-white dark:bg-gray-800 p-2 rounded-full border border-gray-300 dark:border-gray-600 shadow hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
      >
        <ZoomIn size={18} />
      </button>

      {/* Zoom Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4 sm:px-6"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-2 sm:p-4 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
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

            {/* Zoom + Pan Enabled */}
            <TransformWrapper
              wheel={{ step: 0.2 }}
              doubleClick={{ disabled: true }}
              pinch={{ disabled: false }}
              panning={{ velocityDisabled: true }}
              minScale={1}
              initialScale={1}
              maxScale={4}
            >
              <TransformComponent wrapperClass="w-full h-full">
                <div className="h-[70vh] w-full flex justify-center items-center overflow-hidden cursor-grab active:cursor-grabbing">
                  <img
                    src={src}
                    alt="Zoomed"
                    className="object-contain max-h-full max-w-full select-none"
                    draggable={false}
                  />
                </div>
              </TransformComponent>
            </TransformWrapper>
          </div>
        </div>
      )}
    </figure>
  );
};

export default ImageBlockOutput;
