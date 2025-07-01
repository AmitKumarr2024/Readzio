import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { setTags } from '../../store/Post/postMetaSlice';
import { toast } from 'react-hot-toast';

const TagsInput = () => {
  const dispatch = useDispatch();
  const tags = useSelector((state) => state.postMeta.tags || []); // Ensure tags is always an array
  const [inputValue, setInputValue] = useState('');
  const maxTags = 10; // Set a reasonable tag limit

  const addTag = useCallback(() => {
    const trimmed = inputValue.trim().replace(/,$/, '');
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      toast.error('Tag already exists');
      return;
    }
    if (tags.length >= maxTags) {
      toast.error(`Maximum ${maxTags} tags allowed`);
      return;
    }
    dispatch(setTags([...tags, trimmed]));
    setInputValue('');
    console.log('Tag added:', trimmed, 'New tags:', [...tags, trimmed]); // Debug
  }, [inputValue, tags, dispatch]);

  const removeTag = useCallback((tagToRemove) => {
    dispatch(setTags(tags.filter((tag) => tag !== tagToRemove)));
    console.log('Tag removed:', tagToRemove, 'New tags:', tags.filter((tag) => tag !== tagToRemove)); // Debug
  }, [tags, dispatch]);

  const handleKeyDown = useCallback((e) => {
    if (['Enter', ',', 'Tab'].includes(e.key)) {
      e.preventDefault();
      addTag();
    }
  }, [addTag]);

  console.log('TagsInput rendered, tags:', tags); // Debug

  return (
    <div className="mb-6">
      <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
        Tags
      </label>

      <div className="flex flex-wrap gap-2 mb-3 min-h-[40px] p-2 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-sm">
        {Array.isArray(tags) && tags.length > 0 ? (
          tags.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="flex items-center gap-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-600 dark:to-blue-500 dark:text-white px-3 py-1.5 rounded-full text-sm shadow-sm hover:shadow-md transition-all animate-fade-in"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-1 text-blue-500 dark:text-blue-200 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                aria-label={`Remove tag ${tag}`}
              >
                <X size={16} />
              </button>
            </span>
          ))
        ) : (
          <span className="text-gray-500 dark:text-gray-400 text-sm">No tags added yet</span>
        )}
      </div>

      <div className="flex items-center gap-4 mb-3">
        <input
          type="text"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white transition-all"
          placeholder="Type a tag and press Enter, comma, or Tab"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Press <kbd className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">Enter</kbd>,{' '}
          <kbd className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">,</kbd>, or{' '}
          <kbd className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">Tab</kbd> to add a tag.
        </p>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 animate-fade-in">
          {tags.length} tag{tags.length !== 1 ? 's' : ''} added (max {maxTags})
        </p>
      </div>
    </div>
  );
};

export default TagsInput;