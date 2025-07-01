// src/components/ui/Skeleton.jsx

import React from "react";

const Skeleton = React.memo(({
  width = "w-full",          // Tailwind width class, e.g. w-full, w-32, w-1/2
  height = "h-5",            // Tailwind height class, e.g. h-5 (20px), h-10 (40px)
  rounded = "rounded-md",    // Tailwind border radius
  className = "",
  // For custom colors & animation speed, use Tailwind config or extra classes
}) => {
  return (
    <div
      className={`animate-pulse bg-card-bg-light dark:bg-card-bg-dark  ${width} ${height} ${rounded} ${className}`}
    ></div>
  );
});

export default Skeleton;
