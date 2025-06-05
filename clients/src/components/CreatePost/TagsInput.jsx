import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { setTags } from '../../store/Post/postMetaSlice';

const TagsInput = () => {
  const dispatch = useDispatch();
  const tags = useSelector((state) => state.postMeta.tags);
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      dispatch(setTags([...tags, trimmed]));
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove) => {
    dispatch(setTags(tags.filter((tag) => tag !== tagToRemove)));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="mb-5">
      <label className="block mb-2 text-sm font-semibold text-gray-700">Tags</label>

      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="ml-1 text-blue-500 hover:text-red-500"
            >
              <X size={16} />
            </button>
          </span>
        ))}
      </div>

      <input
        type="text"
        className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Type a tag and press Enter"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

export default TagsInput;
