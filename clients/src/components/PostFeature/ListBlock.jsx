import React from "react";

const ListBlock = ({ items = [], ordered = false }) =>
  ordered ? (
    <ol className="list-decimal list-inside my-6 ml-6 space-y-2 text-gray-800 font-medium">
      {items.map((item, i) => (
        <li key={i} className="pl-2">
          {item}
        </li>
      ))}
    </ol>
  ) : (
    <ul className="list-disc list-inside my-6 ml-6 space-y-2 text-gray-800 font-medium">
      {items.map((item, i) => (
        <li key={i} className="pl-2 hover:text-indigo-600 transition">
          {item}
        </li>
      ))}
    </ul>
  );

export default ListBlock;