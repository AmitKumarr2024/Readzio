import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const ToggleSubscribeButton = ({
  authorId,
  isSubscribedProp,
  currentUserId,
}) => {
  const navigate = useNavigate();
  const { subscriptions = [], loading } = useSelector(
    (state) => state.subscription
  );
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const subscriberId = currentUserId || user?._id;
  const [isSubscribedInternal, setIsSubscribedInternal] = useState(false);

  const isSubscribed =
    typeof isSubscribedProp === "boolean"
      ? isSubscribedProp
      : isSubscribedInternal;

  useEffect(() => {
    if (
      !isAuthenticated ||
      !authorId ||
      !subscriberId ||
      authorId === subscriberId
    ) {
      setIsSubscribedInternal(false);
      return;
    }

    const found = subscriptions.some(
      (sub) =>
        String(sub.authorId) === String(authorId) &&
        String(sub.userId) === String(subscriberId) &&
        sub.status === "active"
    );

    setIsSubscribedInternal(found);
  }, [
    subscriptions,
    authorId,
    subscriberId,
    isAuthenticated,
    isSubscribedProp,
  ]);

  const handleClick = () => {
    if (!isAuthenticated) {
      alert("You must be logged in to subscribe.");
      return;
    }

    if (authorId === subscriberId) {
      return;
    }

    navigate(`/plans/${authorId}`);
  };

  if (!isAuthenticated || authorId === subscriberId) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`w-full py-2.5 text-sm font-medium text-white rounded-full shadow-md transition-all duration-300 ${
        isSubscribed
          ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800"
          : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 dark:from-green-600 dark:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800"
      } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {loading
        ? "Processing..."
        : isSubscribed
        ? "You're a Member"
        : "Subscribe Now"}
    </button>
  );
};

export default ToggleSubscribeButton;
