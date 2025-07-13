import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { setTags } from '../../store/Post/postMetaSlice';
import { toast } from 'react-hot-toast';

const TagsInput = () => {
  const dispatch = useDispatch();
  const tags = useSelector((state) => state.postMeta.tags || []);
  const [inputValue, setInputValue] = useState('');
  const maxTags = 10;

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
    console.log('Tag added:', trimmed, 'New tags:', [...tags, trimmed]);
  }, [inputValue, tags, dispatch]);

  const removeTag = useCallback((tagToRemove) => {
    dispatch(setTags(tags.filter((tag) => tag !== tagToRemove)));
    console.log('Tag removed:', tagToRemove, 'New tags:', tags.filter((tag) => tag !== tagToRemove));
  }, [tags, dispatch]);

  const handleKeyDown = useCallback((e) => {
    if (['Enter', ',', 'Tab'].includes(e.key)) {
      e.preventDefault();
      addTag();
    }
  }, [addTag]);

  console.log('TagsInput rendered, tags:', tags);

  return (
    <div className="mb-6">
      <label className="block mb-2 text-sm font-semibold text-text-main-light dark:text-text-main-dark">
        Tags
      </label>

      <div className="flex flex-wrap gap-2 mb-3 min-h-[40px] p-2 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
        {Array.isArray(tags) && tags.length > 0 ? (
          tags.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1.5 rounded-full text-sm shadow-sm hover:shadow-md transition"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-1 text-blue-500 dark:text-blue-300 hover:text-red-500 dark:hover:text-red-400 transition"
                aria-label={`Remove tag ${tag}`}
              >
                <X size={16} />
              </button>
            </span>
          ))
        ) : (
          <span className="text-text-main-light dark:text-text-main-dark opacity-80 text-sm">No tags added yet</span>
        )}
      </div>

      <div className="flex items-center gap-4 mb-3">
        <input
          type="text"
          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-lg bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="Type a tag and press Enter, comma, or Tab"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <div className="flex justify-between items-center">
        <p className="text-xs text-text-main-light dark:text-text-main-dark opacity-80">
          Press <kbd className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Enter</kbd>,{' '}
          <kbd className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">,</kbd>, or{' '}
          <kbd className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Tab</kbd> to add a tag.
        </p>
        <p className="text-sm font-medium text-text-main-light dark:text-text-main-dark">
          {tags.length} tag{tags.length !== 1 ? 's' : ''} added (max {maxTags})
        </p>
      </div>
    </div>
  );
};

export default TagsInput;