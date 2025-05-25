import React from "react";

const HeadingBlock = ({ level = 2, text }) => {
  const Tag = `h${level}`;
  const baseStyles = "w-full text-gray-900 font-extrabold tracking-wide";
  
  const levelStyles = {
    1: "text-5xl md:text-6xl border-b-4 border-gray-800 pb-2 mb-6",
    2: "text-4xl md:text-5xl border-b-2 border-gray-700 pb-2 mb-5",
    3: "text-3xl md:text-4xl border-b border-gray-500 pb-1 mb-4",
    4: "text-2xl md:text-3xl mb-3",
    5: "text-xl md:text-2xl mb-2",
    6: "text-lg md:text-xl mb-2",
  };

  return (
    <Tag className={`${baseStyles} ${levelStyles[level] || levelStyles[2]}`}>
      {text || `Heading Level ${level}`}
    </Tag>
  );
};

export default HeadingBlock;
