import React, { useState } from "react";

const PollBlock = ({ question, options, onChangeQuestion, onChangeOptions }) => {
  const [selected, setSelected] = useState(null);

  // Handle changes for question and options inputs
  return (
    <div className="my-4 p-4 border rounded bg-white shadow-md">
      <label className="font-semibold mb-2 block">Poll Question</label>
      <input
        type="text"
        value={question}
        onChange={(e) => onChangeQuestion(e.target.value)}
        className="w-full mb-3 px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Enter poll question"
      />

      <label className="font-semibold mb-2 block">Options</label>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center mb-1 gap-2">
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
            className="flex-grow px-3 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={`Option ${i + 1}`}
          />
          <button
            type="button"
            onClick={() => onChangeOptions(i, null, true)}
            className="text-red-600 hover:underline font-semibold"
          >
            Remove
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChangeOptions(options.length, "")}
        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700"
      >
        + Add Option
      </button>
    </div>
  );
};

export default PollBlock;
