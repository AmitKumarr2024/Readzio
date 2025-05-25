import React from "react";

const EmojiBlockOutput = ({ emoji = "😀" }) => {
  return (
    <div className="text-4xl select-none my-4">
      {emoji}
    </div>
  );
};

export default EmojiBlockOutput;
