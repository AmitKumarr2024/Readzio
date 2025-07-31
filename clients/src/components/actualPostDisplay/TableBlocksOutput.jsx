// File: src/components/TableBlocksOutput.js (assumed)
const TableBlocksOutput = ({ data, caption }) => {
  console.log("[DEBUG] TableBlocksOutput data:", data);
  if (!Array.isArray(data) || data.length === 0) {
    console.log(
      "[DEBUG] TableBlocksOutput received empty or malformed data, using default"
    );
    return <div className="text-center text-red-500 p-4">No Table Data</div>;
  }
  return (
    <div className="my-4 overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
        {caption && (
          <caption className="caption-bottom p-2 italic text-gray-600 dark:text-gray-400">
            {caption}
          </caption>
        )}
        <thead>
          <tr>
            {data[0].map((header, index) => (
              <th
                key={index}
                className="border border-gray-300 dark:border-gray-700 px-4 py-2 bg-gray-100 dark:bg-gray-800 font-bold text-left"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(1).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableBlocksOutput;
