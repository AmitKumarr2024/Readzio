import React from "react";

const HrOutput = ({ caption }) => {
  return (
    <div className="my-8 w-full flex flex-col items-center">
      <hr className="border-t-2 border-gray-300 w-full max-w-full" />
      {caption && (
        <div className="mt-3 text-center text-sm  text-text-main-light dark:text-text-main-dark italic max-w-full px-2">
          {caption}
        </div>
      )}
    </div>
  );
};

export default HrOutput;
