import React from 'react';

// Progress bar with percentage display
const Progress = ({ value, className }) => {
  const clampedValue = Math.min(Math.max(value, 0), 100); // Clamp value 0-100

  return (
    <div className={`relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 ${className}`}>
      <div
        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-8 rounded-full transition-all duration-500 ease-in-out"
        style={{ width: `${clampedValue}%` }}
      ></div>
      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-medium text-white dark:text-gray-100">
        {Math.round(clampedValue)}%
      </span>
    </div>
  );
};

export default Progress;