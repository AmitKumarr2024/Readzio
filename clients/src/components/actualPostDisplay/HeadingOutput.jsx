import React from "react";

const HeadingOutput = ({ level = 2, text }) => {
  const Tag = `h${level}`;

  // Define font size classes based on heading level
  const fontSizeClass = {
    1: "text-4xl",
    2: "text-3xl",
    3: "text-2xl",
    4: "text-xl",
    5: "text-lg",
    6: "text-base",
  };

  return (
    <Tag
      className={`font-bold text-gray-800 my-6 ${fontSizeClass[level] || "text-2xl"}`}
    >
      {text}
    </Tag>
  );
};

export default HeadingOutput;
