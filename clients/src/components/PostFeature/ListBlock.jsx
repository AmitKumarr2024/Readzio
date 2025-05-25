import React from "react";

const ListBlock = ({ items = [], ordered = false }) =>
  ordered ? (
    <ol className="list-decimal list-inside my-6 ml-6 space-y-2 text-gray-800 font-medium leading-relaxed">
      {items.map((item, i) => (
        <li
          key={i}
          className="relative pl-2 before:absolute before:left-0 before:top-1/2 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full before:bg-green-500"
        >
          {item}
        </li>
      ))}
    </ol>
  ) : (
    <ul className="list-disc list-inside my-6 ml-6 space-y-2 text-gray-700 font-medium leading-relaxed">
      {items.map((item, i) => (
        <li
          key={i}
          className="relative pl-2 hover:text-green-600 transition-colors cursor-default"
        >
          {item}
        </li>
      ))}
    </ul>
  );

export default ListBlock;
