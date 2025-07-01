import React from "react";

const TableBlock = ({ headers = [], rows = [[]], caption = "" }) => {
  // Debug table data
  console.log("[DEBUG] TableBlock props:", { headers, rows, caption });

  // Warn if data is empty or malformed
  const isEmpty = headers.length === 0 && (rows.length === 0 || rows.every(row => row.length === 0));
  if (isEmpty) {
    console.warn("[DEBUG] TableBlock received empty or malformed data");
  }

  return (
    <div className="my-4 overflow-x-auto">
      {isEmpty ? (
        <div className="w-full min-h-[150px] bg-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-500 text-sm italic p-6 border border-gray-300">
          <p className="font-medium">No Table Data</p>
          <p className="text-xs mt-1">Please add headers and rows to display the table</p>
        </div>
      ) : (
        <table className="w-full border border-gray-200 rounded-lg">
          {headers.length > 0 && (
            <thead className="bg-indigo-50">
              <tr>
                {headers.map((header, i) => (
                  <th
                    key={i}
                    className="border border-gray-200 px-4 py-2 font-semibold text-gray-800"
                    scope="col"
                  >
                    {header || "Header"}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.length > 0 && rows.some(row => row.length > 0) ? (
              rows.map((row, i) => (
                <tr
                  key={i}
                  className={`hover:bg-indigo-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                >
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="border border-gray-200 px-4 py-2 text-gray-800"
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
                  className="border border-gray-200 px-4 py-2 text-gray-500 text-center italic"
                >
                  No rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      {caption && <p className="mt-2 text-sm text-gray-500 italic">{caption}</p>}
    </div>
  );
};

export default TableBlock;