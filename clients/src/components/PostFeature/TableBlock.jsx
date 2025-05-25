import React from "react";

const TableBlock = ({ headers = [], rows = [[]], caption = "" }) => (
  <div className="overflow-auto my-4">
    <table className="table-auto w-full border border-gray-300 text-left">
      {headers.length > 0 && (
        <thead className="bg-gray-100">
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                className="border border-gray-300 px-4 py-2 font-semibold text-gray-700"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
          >
            {row.map((cell, j) => (
              <td
                key={j}
                className="border border-gray-300 px-4 py-2 text-gray-800"
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    {caption && (
      <div className="text-xs text-gray-400 italic mt-1">{caption}</div>
    )}
  </div>
);

export default TableBlock;
