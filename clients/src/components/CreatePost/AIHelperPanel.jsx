// File: components/AI/AIHelperPanel.jsx
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAISuggestion, resetAISuggestion } from '../../store/aiSlice';
import { X } from 'lucide-react';

const AIHelperPanel = ({ blocks, onClose }) => {
  const dispatch = useDispatch();
  const { suggestion, loading, error } = useSelector((state) => state.ai);
  const [prompt, setPrompt] = useState('Can you improve this post?');

  const contentContext = blocks
    .flatMap((block) => [block.text, block.value, block.code, block.caption])
    .filter(Boolean)
    .join('\n');

  const handleSubmit = async () => {
    dispatch(fetchAISuggestion({ prompt, context: contentContext }));
  };

  const handleClose = () => {
    dispatch(resetAISuggestion());
    onClose();
  };

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-[400px] bg-white shadow-xl z-50 flex flex-col border-l border-gray-200">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">AI Suggestion Panel</h2>
        <button onClick={handleClose}>
          <X className="w-5 h-5 text-gray-500 hover:text-red-500" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <label className="block text-sm font-medium text-gray-700">Your Instruction</label>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-2 border rounded resize-none"
        />

        <button
          onClick={handleSubmit}
          disabled={loading || !prompt.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Thinking...' : 'Get Suggestion'}
        </button>

        {error && <p className="text-red-500 text-sm">Error: {error}</p>}
        {suggestion && (
          <div className="mt-4 p-3 bg-gray-100 border rounded text-sm whitespace-pre-wrap">
            {suggestion}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIHelperPanel;
