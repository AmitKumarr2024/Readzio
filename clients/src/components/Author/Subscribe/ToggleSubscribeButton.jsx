// client/src/components/Author/Subscribe/ToggleSubscribeButton.js
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const ToggleSubscribeButton = ({ authorId, isSubscribed: isSubscribedProp, currentUserId }) => {
  const navigate = useNavigate();
  const { subscriptions = [], loading } = useSelector((state) => state.subscription);
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const subscriberId = currentUserId || user?._id;
  const [isSubscribedInternal, setIsSubscribedInternal] = useState(false);

  const isSubscribed = typeof isSubscribedProp === 'boolean' ? isSubscribedProp : isSubscribedInternal;

  useEffect(() => {
    if (!isAuthenticated || !authorId || !subscriberId || authorId === subscriberId) {
      setIsSubscribedInternal(false);
      return;
    }

    const found = subscriptions.some(
      (sub) =>
        String(sub.authorId) === String(authorId) &&
        String(sub.userId) === String(subscriberId) &&
        sub.status === 'active'
    );

    setIsSubscribedInternal(found);
  }, [subscriptions, authorId, subscriberId, isAuthenticated, isSubscribedProp]);

  const handleClick = () => {
    if (!isAuthenticated) {
      alert('You must be logged in to subscribe.');
      return;
    }

    if (authorId === subscriberId) {
      console.log('⚠️ Cannot subscribe to self.');
      return;
    }

    // Navigate to plan page on click
    navigate(`/plans/${authorId}`);
  };

  if (!isAuthenticated || authorId === subscriberId) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`w-full py-2 rounded text-text-main-light dark:text-text-main-dark transition-colors duration-200 ${
        isSubscribed ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-500 hover:bg-green-600'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? 'Processing...' : isSubscribed ? 'You’re a Member' : 'Subscribe Now'}
    </button>
  );
};

export default ToggleSubscribeButton;