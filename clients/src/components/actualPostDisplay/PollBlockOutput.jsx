import React, { useState } from "react";

const PollBlockOutput = ({ question, options = [], caption }) => {
  const [votes, setVotes] = useState(() =>
    Object.fromEntries(options.map((opt) => [opt, 0]))
  );
  const [selected, setSelected] = useState(null);

  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);

  const handleVote = (option) => {
    if (selected) return;
    setVotes((prev) => ({ ...prev, [option]: prev[option] + 1 }));
    setSelected(option);
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white border border-yellow-300 rounded-xl p-6 my-6 shadow-sm">
      <h4 className="text-lg font-semibold text-yellow-700 mb-4">{question}</h4>

      <div className="space-y-3">
        {options.map((option, idx) => {
          const count = votes[option];
          const percent = totalVotes ? ((count / totalVotes) * 100).toFixed(1) : 0;

          return (
            <div key={idx}>
              <button
                onClick={() => handleVote(option)}
                disabled={!!selected}
                className={`w-full px-4 py-2 text-left rounded-lg border ${
                  selected === option
                    ? "bg-yellow-300 border-yellow-500"
                    : "bg-yellow-100 border-yellow-200 hover:bg-yellow-200"
                } ${selected ? "opacity-80 cursor-not-allowed" : ""}`}
              >
                {option}
              </button>

              {selected && (
                <div className="mt-1 text-sm text-gray-700">
                  <div className="w-full bg-yellow-100 h-2 rounded">
                    <div
                      className="h-2 bg-yellow-500 rounded"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs">{percent}% ({count} vote{count !== 1 ? "s" : ""})</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="text-green-600 mt-4 font-medium">✅ Thank you for voting!</div>
      )}

      {caption && (
        <div className="text-sm text-gray-500 italic mt-4 border-t pt-2">{caption}</div>
      )}
    </div>
  );
};

export default PollBlockOutput;
