import React from "react";

const VideoBlock = ({ src, caption, autoPlay = false, muted = false, loop = false }) => {
  if (!src) return <div className="text-red-500 p-4">Invalid video URL</div>;

  const isYouTube = src.includes("youtube.com") || src.includes("youtu.be");

  const getYouTubeEmbedURL = (url) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^\s&]+)/);
    const videoId = match ? match[1] : "";
    return `https://www.youtube.com/embed/${videoId}?autoplay=${autoPlay ? 1 : 0}&mute=${muted ? 1 : 0}&loop=${loop ? 1 : 0}&playlist=${videoId}`;
  };

  return (
    <div className="my-6">
      {isYouTube ? (
        <div className="relative aspect-w-16 aspect-h-9">
          <iframe
            src={getYouTubeEmbedURL(src)}
            title="YouTube Video"
            className="w-full h-full rounded-xl shadow-lg"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
      ) : (
        <video
          controls
          src={src}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          className="w-full max-h-96 rounded-xl shadow-lg"
        />
      )}
      {caption && <p className="mt-2 text-sm text-gray-500 italic">{caption}</p>}
    </div>
  );
};

export default VideoBlock;