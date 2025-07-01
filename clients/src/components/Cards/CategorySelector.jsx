// src/components/CategorySelector.js
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories, createCategory, selectCategory } from '../features/categories/categorySlice';
import toast, { Toaster } from 'react-hot-toast';
import { X } from 'lucide-react';

const CategorySelector = ({ onBack, onContinue, onClose, isNewUser = false }) => {
  const dispatch = useDispatch();
  const { categories, selectedCategory, status, error } = useSelector((state) => state.categories);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [hasContinuedOrSelected, setHasContinuedOrSelected] = useState(false);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleAddCategory = async () => {
    const trimmedName = newCategoryName.trim();
    const trimmedSlug = newCategorySlug.trim();
    if (!trimmedName || !trimmedSlug) {
      return toast.error('Category name and slug are required');
    }
    await dispatch(createCategory({ name: trimmedName, slug: trimmedSlug, description: newCategoryDescription }));
    setNewCategoryName('');
    setNewCategorySlug('');
    setNewCategoryDescription('');
  };

  const handleContinue = () => {
    if (!selectedCategory) {
      return toast.error('Please select or create a category');
    }
    setHasContinuedOrSelected(true);
    onContinue(selectedCategory);
  };

  const handleClose = () => {
    if (!hasContinuedOrSelected && isNewUser) {
      toast.error('Please select a category before closing');
    } else {
      onClose();
    }
  };

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-full max-w-md mx-auto">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-700 hover:text-red-600 transition"
          aria-label="Close"
        >
          <X size={28} />
        </button>

        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          {isNewUser ? 'Select Your Interests' : 'Select Post Category'}
        </h2>

        {status === 'loading' && <p>Loading categories...</p>}
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Choose Existing Category
        </label>
        <select
          value={selectedCategory?.name || ''}
          onChange={(e) => {
            const selected = categories.find((cat) => cat.name === e.target.value);
            dispatch(selectCategory(selected || null));
            setHasContinuedOrSelected(true);
          }}
          className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
        >
          <option value="">-- Select a category --</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>

        <label className="block text-sm font-medium mb-1 text-gray-700">
          Or Add a New Category
        </label>
        <div className="flex flex-col gap-2 mb-6">
          <input
            type="text"
            placeholder="Category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="flex-grow p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="text"
            placeholder="Category slug"
            value={newCategorySlug}
            onChange={(e) => setNewCategorySlug(e.target.value)}
            className="flex-grow p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="text"
            placeholder="Category description (optional)"
            value={newCategoryDescription}
            onChange={(e) => setNewCategoryDescription(e.target.value)}
            className="flex-grow p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleAddCategory}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
          >
            Add
          </button>
        </div>

        <div className="flex justify-between items-center">
          {onBack && (
            <button onClick={onBack} className="text-gray-500 hover:underline">
              ⬅ Back
            </button>
          )}
          <button
            onClick={handleContinue}
            className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition"
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
};

export default CategorySelector;