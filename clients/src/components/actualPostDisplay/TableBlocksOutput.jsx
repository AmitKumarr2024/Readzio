import React from "react";

const TableBlocksOutput = ({ data = [], caption }) => {
  const [headers = [], ...rows] = data;

  return (
    <div
      className="my-8 w-full max-w-full overflow-x-auto rounded-lg shadow-md border"
      style={{ borderColor: "#98c1d9", backgroundColor: "#e0fbfc" }}
    >
      <table
        className="w-full table-auto text-text-main"
        style={{ color: "#3d5a80" }}
      >
        {headers.length > 0 && (
          <thead style={{ backgroundColor: "#98c1d9" }}>
            <tr>
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-6 py-3 font-semibold text-left tracking-wide"
                  style={{ color: "#e0fbfc" }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        )}

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              style={{
                backgroundColor: rowIndex % 2 === 0 ? "#e0fbfc" : "#d0e7ef",
              }}
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-6 py-3"
                  style={{ color: "#3d5a80" }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {caption && (
        <div
          className="px-6 py-3 text-sm italic"
          style={{
            color: "#3d5a80",
            backgroundColor: "#d0e7ef",
            borderTop: "1px solid #98c1d9",
            borderRadius: "0 0 0.5rem 0.5rem",
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
};

export default TableBlocksOutput;
