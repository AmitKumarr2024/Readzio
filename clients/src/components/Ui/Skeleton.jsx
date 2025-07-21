import React from "react";

const Skeleton = React.memo(({
  width = "w-full",          // Tailwind width class
  height = "h-5",            // Tailwind height class
  rounded = "rounded-md",    // Tailwind border radius
  className = "",
}) => {
  return (
    <div
      className={`animate-pulse bg-card-bg-light dark:bg-card-bg-dark ${width} ${height} ${rounded} ${className}`}
    ></div>
  );
});

export default Skeleton;
