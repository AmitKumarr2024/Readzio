import React from "react";

// Detect if URL is YouTube
const isYouTubeUrl = (url) => {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/i.test(url);
};

// Extract YouTube Video ID
const extractYouTubeId = (url) => {
  const match = url.match(/(?:youtube\.com\/.*v=|youtu\.be\/)([^\s&?/]+)/i);
  return match ? match[1] : null;
};

// Get YouTube embed URL with autoplay/mute/loop
const getYouTubeEmbedURL = (url, { autoPlay, muted, loop }) => {
  const videoId = extractYouTubeId(url);
  if (!videoId) return "";
  const params = new URLSearchParams({
    autoplay: autoPlay ? 1 : 0,
    mute: muted ? 1 : 0,
    loop: loop ? 1 : 0,
    postlist: loop ? videoId : undefined,
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
};

const VideoBlock = ({
  src,
  caption,
  autoPlay = false,
  muted = false,
  loop = false,
}) => {
  if (!src) return <div className="text-red-500 p-4">Invalid video URL</div>;

  const isYouTube = isYouTubeUrl(src);

  return (
    <div className="my-6">
      {isYouTube ? (
        <div className="relative w-full pt-[56.25%]">
          <iframe
            src={getYouTubeEmbedURL(src, { autoPlay, muted, loop })}
            title="YouTube Video"
            className="absolute top-0 left-0 w-full h-full rounded-xl shadow-lg"
            allow="autoplay; encrypted-media; clipboard-write; picture-in-picture"
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
          className="w-full max-h-96 rounded-lg shadow-lg"
        />
      )}
      {caption && (
        <p className="mt-2 text-sm text-gray-500 italic">{caption}</p>
      )}
    </div>
  );
};

export default VideoBlock;
