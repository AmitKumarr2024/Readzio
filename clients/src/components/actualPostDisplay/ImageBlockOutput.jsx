import React, { useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, X } from "lucide-react";

const ImageBlockOutput = ({ src, caption, isEmbed }) => {
  const [modalOpen, setModalOpen] = useState(false);

  // Improved debug logging
  useEffect(() => {
    console.log(
      "[ImageBlockOutput] Props:",
      JSON.stringify({ src, isEmbed, caption }, null, 2)
    );
    if (isEmbed) {
      if (!src) {
        console.error("[ImageBlockOutput] Missing src for embed");
      } else if (
        !src.includes("instagram.com/reel/") ||
        !src.includes("/embed")
      ) {
        console.warn("[ImageBlockOutput] Invalid Instagram embed URL:", src);
      }
    }
  }, [src, isEmbed, caption]);

  return (
    <figure className="my-6 relative">
      {isEmbed ? (
        src && src.includes("instagram.com/reel/") && src.includes("/embed") ? (
          <div className="relative w-full aspect-video max-h-[550px]">
            <iframe
              src={src}
              className="rounded-lg shadow-md w-full h-full"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="Instagram Reel"
              onError={(e) =>
                console.error(
                  "[ImageBlockOutput] Iframe failed to load:",
                  src,
                  e.message
                )
              }
              style={{ minHeight: "300px" }} // Ensure visibility
            />
          </div>
        ) : (
          <div className="text-red-500 text-center p-4 border border-red-500 rounded-lg">
            {src ? "Invalid Instagram embed URL" : "Missing embed URL"}
          </div>
        )
      ) : src ? (
        <img
          src={src}
          alt={caption || "Image"}
          className="rounded-lg shadow-md max-h-[550px] aspect-video object-contain w-full"
          loading="lazy"
          onError={(e) =>
            console.error(
              "[ImageBlockOutput] Image failed to load:",
              src,
              e.message
            )
          }
        />
      ) : (
        <div className="text-red-500 text-center p-4 border border-red-500 rounded-lg">
          Missing image URL
        </div>
      )}
      {caption && (
        <figcaption className="text-sm text-center text-text-main-light dark:text-text-main-dark mt-2">
          {caption}
        </figcaption>
      )}

      {/* Zoom Button (only for images, not embeds) */}
      {!isEmbed && src && (
        <button
          onClick={() => setModalOpen(true)}
          title="Zoom"
          className="absolute bottom-2 right-2 bg-white dark:bg-gray-800 p-2 rounded-full border border-gray-300 dark:border-gray-600 shadow hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
        >
          <ZoomIn size={18} />
        </button>
      )}

      {/* Zoom Modal (only for images) */}
      {!isEmbed && modalOpen && src && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4 sm:px-6"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-2 sm:p-4 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
              title="Close"
            >
              <X size={22} />
            </button>
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
