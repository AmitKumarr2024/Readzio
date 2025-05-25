import React from "react";
const TableBlock = ({ data = [[]] }) => (
  <div className="overflow-auto my-4">
    <table className="table-auto w-full border border-gray-300">
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} className="border px-4 py-2">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
export default TableBlock;