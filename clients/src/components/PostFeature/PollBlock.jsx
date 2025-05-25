import React, { useState } from "react";
const PollBlock = ({ question, options }) => {
  const [selected, setSelected] = useState(null);
  return (
    <div className="my-4 p-4 border rounded">
      <p className="font-semibold mb-2">{question}</p>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center mb-1">
          <input
            type="radio"
            id={`poll-${i}`}
            name="poll"
            value={opt}
            checked={selected === opt}
            onChange={() => setSelected(opt)}
            className="mr-2"
          />
          <label htmlFor={`poll-${i}`}>{opt}</label>
        </div>
      ))}
    </div>
  );
};
export default PollBlock;