import React, { useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, X } from "lucide-react";

const ImageBlockOutput = ({ src, caption, isEmbed }) => {
  const [modalOpen, setModalOpen] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log(
      "[ImageBlockOutput] Props:",
      JSON.stringify({ src, isEmbed, caption }, null, 2)
    );
    if (isEmbed) {
      if (!src) {
        console.error("[ImageBlockOutput] Missing src for embed");
      } else if (!src.includes("instagram.com")) {
        console.warn("[ImageBlockOutput] Invalid Instagram URL:", src);
      }
    } else if (
      src &&
      src.includes("scontent") &&
      src.includes("instagram.com")
    ) {
      console.log("[ImageBlockOutput] Using proxy for Instagram image:", src);
    }
  }, [src, isEmbed, caption]);

  // Proxy Instagram images to bypass CORS
  const getImageSrc = (src) => {
    if (!isEmbed && src.includes("scontent") && src.includes("instagram.com")) {
      return `/api/proxy/proxy-image?url=${encodeURIComponent(src)}`;
    }
    return src;
  };

  const handleError = (e, type = "Image") => {
    console.error(
      `[ImageBlockOutput] ${type} failed to load:`,
      src,
      e.type || e.message
    );
  };

  // Ensure Instagram embed URL
  const getEmbedSrc = (src) => {
    if (!src) return "";
    let finalSrc = src;
    if (!src.includes("/embed")) {
      finalSrc = src.endsWith("/") ? `${src}embed` : `${src}/embed`;
    }
    return finalSrc;
  };

  return (
    <figure className="my-6 relative">
      {isEmbed ? (
        src && src.includes("instagram.com") ? (
          <div className="relative w-full max-w-[600px] mx-auto min-h-[300px] h-[500px] sm:h-[550px]">
            <iframe
              src={getEmbedSrc(src)}
              className="rounded-lg shadow-md w-full h-full"
              frameBorder="0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              title="Instagram Embed"
              onError={(e) => handleError(e, "Iframe")}
              onLoad={() =>
                console.log(
                  "[ImageBlockOutput] Iframe loaded:",
                  getEmbedSrc(src)
                )
              }
              loading="lazy"
            />
          </div>
        ) : (
          <div className="text-red-500 text-center p-4 border border-red-500 rounded-lg">
            {src ? "Invalid Instagram URL" : "Missing embed URL"}
          </div>
        )
      ) : src ? (
        <img
          src={getImageSrc(src)}
          alt={caption || "Image"}
          className="rounded-lg shadow-md max-h-[550px] w-full object-contain"
          loading="lazy"
          onError={(e) => handleError(e, "Image")}
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

      {/* Zoom Button (only for non-embed images with valid src) */}
      {!isEmbed && src && !src.includes("instagram.com/reel") && (
        <button
          onClick={() => setModalOpen(true)}
          title="Zoom"
          className="absolute bottom-2 right-2 bg-white dark:bg-gray-800 p-2 rounded-full border border-gray-300 dark:border-gray-600 shadow hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
          aria-label="Zoom image"
        >
          <ZoomIn size={18} />
        </button>
      )}

      {/* Zoom Modal */}
      {!isEmbed && modalOpen && src && !src.includes("instagram.com/reel") && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-2 sm:px-4"
          onClick={() => setModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Image zoom modal"
        >
          <div
            className="relative bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-2 sm:p-4 rounded-lg shadow-xl max-w-[90vw] max-h-[90vh] w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
              title="Close"
              aria-label="Close zoom modal"
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
                <div className="h-[80vh] sm:h-[70vh] w-full flex justify-center items-center overflow-hidden cursor-grab active:cursor-grabbing">
                  <img
                    src={getImageSrc(src)}
                    alt="Zoomed"
                    className="object-contain max-h-full max-w-full select-none"
                    draggable={false}
                    onError={(e) => handleError(e, "Zoomed Image")}
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
