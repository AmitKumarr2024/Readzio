import React from "react";
import { PlayCircle } from "lucide-react";

const isYouTubeUrl = (url) => {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/.test(url);
};

const getYouTubeEmbedUrl = (url) => {
  const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : null;
};

const VideoBlockOutput = ({ src, caption }) => {
  if (!src) return <div className="text-center  text-text-main-light dark:text-text-main-dark italic">No video source provided</div>;

  const isYouTube = isYouTubeUrl(src);
  const embedUrl = isYouTube ? getYouTubeEmbedUrl(src) : src;

  return (
    <div className="max-w-3xl mx-auto mt-10 mb-14">
      <div className="relative w-full pt-[56.25%] rounded-2xl overflow-hidden shadow-2xl border border-gray-300 bg-black">
        {isYouTube ? (
          <iframe
            src={embedUrl}
            className="absolute top-0 left-0 w-full h-full"
            title="Embedded video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        ) : (
          <video
            src={embedUrl}
            controls
            preload="metadata"
            className="absolute aspect-video top-0 left-0 w-full h-full object-cover"
          >
            Sorry, your browser doesn't support embedded videos.
          </video>
        )}
      </div>

      {caption && (
        <div className="mt-4 text-sm  text-text-main-light dark:text-text-main-dark flex items-center justify-center gap-2 italic">
          <PlayCircle size={16} className="text-blue-500" />
          {caption}
        </div>
      )}
    </div>
  );
};

export default VideoBlockOutput;
