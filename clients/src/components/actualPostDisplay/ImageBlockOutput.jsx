import React, { useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, X } from "lucide-react";

const ImageBlockOutput = ({ src, caption }) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <figure className="my-6 relative">
      <img
        src={src}
        alt={caption || "Image"}
        className="rounded-lg shadow-md max-h-[550px] w-auto mx-auto block custom-image-rendering"
        loading="lazy"
      />
      {caption && (
        <figcaption className="text-sm text-center text-gray-600 dark:text-gray-400 mt-2">
          {caption}
        </figcaption>
      )}

      {/* Zoom Button */}
      <button
        onClick={() => setModalOpen(true)}
        title="Zoom"
        className="absolute bottom-2 right-2 bg-white dark:bg-gray-800 p-2 rounded-full border border-gray-300 dark:border-gray-600 shadow hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <ZoomIn size={18} />
      </button>

      {/* Zoom Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative bg-white dark:bg-gray-900 p-4 rounded-lg shadow-2xl max-w-[95vw] max-h-[95vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>

            {/* Zoom + Pan Container */}
            <TransformWrapper
              wheel={{ step: 0.1 }}
              doubleClick={{ disabled: false, step: 0.7 }}
              pinch={{ disabled: false }}
              panning={{
                velocityDisabled: true,
                paddingSize: 40,
              }}
              minScale={0.5}
              initialScale={1}
              maxScale={8}
              limitToBounds={true}
              centerOnInit={true}
            >
              <TransformComponent
                wrapperClass="w-full h-full"
                contentClass="flex justify-center items-center"
              >
                <div className="max-h-[85vh] max-w-[85vw] flex justify-center items-center">
                  <img
                    src={src}
                    alt="Zoomed view"
                    className="select-none pointer-events-none"
                    style={{
                      maxHeight: "85vh",
                      maxWidth: "85vw",
                      height: "auto",
                      width: "auto",
                    }}
                    draggable={false}
                  />
                </div>
              </TransformComponent>
            </TransformWrapper>

            {caption && (
              <div className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                {caption}
              </div>
            )}
          </div>
        </div>
      )}
    </figure>
  );
};

export default ImageBlockOutput;
