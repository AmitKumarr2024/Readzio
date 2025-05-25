import React from "react";
const VideoBlock = ({ src, caption }) => (
  <div className="my-4">
    <video controls className="w-full rounded-lg">
      <source src={src} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
    {caption && <p className="text-sm text-gray-600 mt-1">{caption}</p>}
  </div>
);
export default VideoBlock;