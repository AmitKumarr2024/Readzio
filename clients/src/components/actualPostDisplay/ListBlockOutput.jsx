import React from "react";

const ListBlockOutput = ({ items = [], ordered = false }) => {
  if (!items.length) return null;

  if (ordered) {
    return (
      <ol className="list-decimal list-inside my-3 space-y-1  text-text-main-light dark:text-text-main-dark">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>
    );
  }

  return (
    <ul className="list-disc list-inside my-3 space-y-1 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
};

export default ListBlockOutput;
