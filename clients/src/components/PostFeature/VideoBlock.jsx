import React from "react";

const VideoBlock = ({ src, caption, autoPlay = false, muted = false, loop = false }) => {
  const isYouTube = src.includes("youtube.com") || src.includes("youtu.be");

  // Convert standard YouTube URL to embed URL
  const getYouTubeEmbedURL = (url) => {
    let videoId = "";
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^\s&]+)/);
    if (match) {
      videoId = match[1];
    }
    return `https://www.youtube.com/embed/${videoId}?autoplay=${autoPlay ? 1 : 0}&mute=${muted ? 1 : 0}&loop=${loop ? 1 : 0}&playlist=${videoId}`;
  };

  return (
    <div className="my-6">
      {isYouTube ? (
        <div className="aspect-w-16 aspect-h-9 w-full">
          <iframe
            src={getYouTubeEmbedURL(src)}
            title="YouTube Video"
            className="w-full h-full rounded-xl shadow"
            allow="autoplay; encrypted-media"
            allowFullScreen
          ></iframe>
        </div>
      ) : (
        <video
          controls
          src={src}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          className="w-full rounded-xl shadow"
        />
      )}
      {caption && (
        <div className="text-sm text-gray-600 italic mt-2">{caption}</div>
      )}
    </div>
  );
};

export default VideoBlock;
