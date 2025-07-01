import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useAdBlockDetector from '../Ads/useAdBlockDetector';

const AdCard = ({ adIndex, adContent, adImage, adSize = 'responsive', postId, className = '' }) => {
  const dispatch = useDispatch();
  const isAdBlocked = useAdBlockDetector();
  const { loading, error } = useSelector((state) => state.ads || {});

  useEffect(() => {
    if (isAdBlocked) {
      console.warn('Ad blocker detected for ad:', adIndex);
    }
  }, [isAdBlocked, adIndex]);

  if (isAdBlocked || error) {
    return (
      <div className={`p-4 text-center opacity-50 ${className}`}>
        <p className="text-sm text-gray-600">Ad blocked or failed to load</p>
      </div>
    );
  }

  const sizeStyles = {
    medium: 'w-full max-w-[336px] h-auto max-h-40',
    large: 'w-full max-w-[336px] h-auto max-h-56',
    mobile: 'w-full max-w-[300px] h-auto max-h-32',
    responsive: 'w-full h-auto max-h-40',
  };

  return (
    <div className={`w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 ${className}`}>
      <p className="text-xs text-gray-500  uppercase font-semibold mb-2 text-center">Sponsored</p>
      <img
        src={adImage}
        alt={`Advertisement ${adIndex}`}
        className={`${sizeStyles[adSize] || sizeStyles.responsive} object-cover rounded-md mb-3 mx-auto`}
        onError={(e) => (e.target.src = 'https://placehold.co/150x100?text=Ad+Failed')}
        loading="lazy"
      />
      <p className="text-sm text-gray-700 dark:text-gray-300 text-center">{adContent}</p>
    </div>
  );
};

export default AdCard;
