import React, { useState } from "react";

const PollBlock = ({ question = "", options = [], onChangeQuestion, onChangeOptions }) => {
  const [selected, setSelected] = useState(null);

  return (
    <div className="my-4 p-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-xl shadow-md border border-gray-200">
      <label className="font-semibold mb-2 block text-text-main-light dark:text-text-main-dark">Poll Question</label>
      <input
        type="text"
        value={question}
        onChange={(e) => onChangeQuestion(e.target.value)}
        className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Enter poll question"
      />
      <label className="font-semibold mb-2 block text-text-main-light dark:text-text-main-dark">Options</label>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center mb-2 gap-2">
          <input
            type="radio"
            id={`poll-${i}`}
            name="poll"
            value={opt}
            checked={selected === opt}
            onChange={() => setSelected(opt)}
            className="mr-2"
            disabled
          />
          <input
            type="text"
            value={opt}
            onChange={(e) => onChangeOptions(i, e.target.value)}
            className="flex-grow px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={`Option ${i + 1}`}
          />
          <button
            onClick={() => onChangeOptions(i, null, true)}
            className="text-red-500 hover:text-red-700 font-semibold"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={() => onChangeOptions(options.length, "")}
        className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
      >
        + Add Option
      </button>
    </div>
  );
};

export default PollBlock;