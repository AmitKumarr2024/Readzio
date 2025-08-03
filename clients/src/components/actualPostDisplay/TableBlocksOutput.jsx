const TableBlocksOutput = ({ data, caption }) => {
  // console.log("[TableBlocksOutput] Rendering with data:", { data, caption });

  if (!Array.isArray(data) || data.length === 0) {
    console.warn("[TableBlocksOutput] Empty or malformed data received");
    return (
      <div className="text-center text-gray-500 p-4">
        No table data available
      </div>
    );
  }

  const headers = data[0] || [];
  const rows = data.slice(1);

  return (
    <div className="my-4 overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
        {caption && (
          <caption className="caption-bottom p-2 italic text-gray-600 dark:text-gray-400">
            {caption}
          </caption>
        )}
        {headers.length > 0 && (
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="border border-gray-300 dark:border-gray-700 px-4 py-2 bg-gray-100 dark:bg-gray-800 font-bold text-left"
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
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left"
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
                className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center italic"
              >
                No rows
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TableBlocksOutput;
