import React, { useState, useEffect } from "react";

const PollBlock = ({
  question = "",
  options = [],
  onChangeQuestion,
  onChangeOptions,
}) => {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    // console.log("[PollBlock] Initial options:", options);
    if (options.length === 0) {
      // console.log("[PollBlock] Adding empty option");
      onChangeOptions(0, "");
    }
  }, [options, onChangeOptions]);

  const handleOptionChange = (index, value) => {
    // console.log("[PollBlock] Option changed:", { index, value });
    const trimmed = value.trimStart();
    onChangeOptions(index, trimmed);
  };

  const handleAddOption = () => {
    // console.log(
    //   "[PollBlock] Adding new option, current length:",
    //   options.length
    // );
    if (options.length >= 10) {
      // console.log("[PollBlock] Max options limit reached (10)");
      return;
    }
    onChangeOptions(options.length, "");
  };

  const handleRemoveOption = (index) => {
    // console.log("[PollBlock] Removing option at index:", index);
    onChangeOptions(index, null, true);
  };

  // console.log(
  //   "[PollBlock] Rendering with question:",
  //   question,
  //   "options:",
  //   options
  // );

  return (
    <div className="my-4 p-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-xl shadow-md border border-gray-200">
      <label className="font-semibold mb-2 block">Poll Question</label>
      <input
        type="text"
        value={question}
        onChange={(e) => {
          // console.log("[PollBlock] Question changed:", e.target.value);
          onChangeQuestion(e.target.value);
        }}
        className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Enter poll question"
      />

      <label className="font-semibold mb-2 block">Options</label>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center mb-2 gap-2">
          <input
            type="radio"
            name="poll"
            value={opt}
            checked={selected === opt}
            disabled
            className="mr-2"
          />
          <input
            type="text"
            value={opt}
            onChange={(e) => handleOptionChange(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            className="flex-grow px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => handleRemoveOption(i)}
            className="text-red-500 hover:text-red-700 font-semibold"
            type="button"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        onClick={handleAddOption}
        type="button"
        className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
      >
        + Add Option
      </button>
    </div>
  );
};

export default PollBlock;
