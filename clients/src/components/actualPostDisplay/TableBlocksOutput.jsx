// File: src/actualPostDisplay/TableBlocksOutput.js
import React from "react";

const TableBlocksOutput = ({ data = [], caption = "" }) => {
  // Debug table data
  console.log("[DEBUG] TableBlocksOutput props:", { data, caption });

  // Normalize and validate data
  const isEmpty =
    !Array.isArray(data) ||
    data.length === 0 ||
    data.every((row) => !Array.isArray(row) || row.length === 0);
  const normalizedData = isEmpty
    ? [
        ["Header 1", "Header 2"],
        ["Cell 1", "Cell 2"],
      ]
    : data;

  if (isEmpty) {
    console.warn(
      "[DEBUG] TableBlocksOutput received empty or malformed data, using default"
    );
  }

  const [headers = [], ...rows] = normalizedData;

  return (
    <div className="my-4 w-full max-w-full overflow-x-auto rounded-lg shadow-md border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
      {isEmpty ? (
        <div className="w-full min-h-[150px] flex flex-col items-center justify-center text-text-main-light dark:text-text-main-dark text-sm italic p-6">
          <p className="font-medium">No Table Data</p>
          <p className="text-xs mt-1">
            Please add headers and rows to display the table
          </p>
        </div>
      ) : (
        <table className="w-full table-auto text-text-main-light dark:text-text-main-dark">
          {headers.length > 0 && (
            <thead className="bg-accent-light dark:bg-accent-dark">
              <tr>
                {headers.map((header, idx) => (
                  <th
                    key={idx}
                    className="border border-border-light dark:border-border-dark px-4 py-2 font-semibold text-left tracking-wide text-text-main-light dark:text-text-main-dark"
                    scope="col"
                  >
                    {header || "Header"}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`hover:bg-accent-light/50 dark:hover:bg-accent-dark/50 ${
                    rowIndex % 2 === 0
                      ? "bg-background-light dark:bg-background-dark"
                      : "bg-background-alt-light dark:bg-background-alt-dark"
                  }`}
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="border border-border-light dark:border-border-dark px-4 py-2 text-text-main-light dark:text-text-main-dark"
                    >
                      {cell || "Cell"}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={headers.length || 1}
                  className="border border-border-light dark:border-border-dark px-4 py-2 text-center italic text-text-main-light dark:text-text-main-dark"
                >
                  No rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      {caption && (
        <p className="mt-2 px-4 py-2 text-sm italic text-text-main-light dark:text-text-main-dark bg-background-alt-light dark:bg-background-alt-dark border-t border-border-light dark:border-border-dark rounded-b-lg">
          {caption}
        </p>
      )}
    </div>
  );
};

export default TableBlocksOutput;
