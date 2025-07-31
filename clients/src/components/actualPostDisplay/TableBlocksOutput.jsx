import React from "react";

const TableBlocksOutput = ({ data = [], caption }) => {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="my-8 text-red-500 italic  dark:text-text-main-dark">
        No table data provided.
      </div>
    );
  }

  const [headers = [], ...rows] = data;

  return (
    <div className="my-8 w-full max-w-full overflow-x-auto rounded-lg shadow-md border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
      <table className="w-full table-auto text-text-main-light dark:text-text-main-dark">
        {headers.length > 0 && (
          <thead className="bg-accent-light dark:bg-accent-dark">
            <tr>
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-6 py-3 font-semibold text-left tracking-wide text-text-main-light dark:text-text-main-dark"
                >
                  {header}
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
                className={
                  rowIndex % 2 === 0
                    ? "bg-background-light dark:bg-background-dark"
                    : "bg-background-alt-light dark:bg-background-alt-dark"
                }
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-6 py-3 text-text-main-light dark:text-text-main-dark"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={headers.length || 1}
                className="px-6 py-3 text-center text-text-main-light dark:text-text-main-dark"
              >
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {caption && (
        <div className="px-6 py-3 text-sm italic text-text-main-light dark:text-text-main-dark bg-background-alt-light dark:bg-background-alt-dark border-t border-border-light dark:border-border-dark rounded-b-lg">
          {caption}
        </div>
      )}
    </div>
  );
};

export default TableBlocksOutput;
