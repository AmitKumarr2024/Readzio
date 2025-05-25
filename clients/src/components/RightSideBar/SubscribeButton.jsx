// components/SubscribeButton.jsx
import React, { useState } from "react";

const SubscribeButton = ({ initialCount = 0 }) => {
  const [subscribed, setSubscribed] = useState(false);
  const [count, setCount] = useState(initialCount);

  const handleSubscribe = () => {
    if (!subscribed) {
      setCount((prev) => prev + 1);
    } else {
      setCount((prev) => prev - 1);
    }
    setSubscribed(!subscribed);
  };

  return (
    <div className="mt-4 flex flex-col items-center gap-1">
      <button
        onClick={handleSubscribe}
        className={`px-4 py-2 rounded-full text-white text-sm font-medium transition-all duration-200 ${
          subscribed ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {subscribed ? "Subscribed" : "Subscribe"}
      </button>
      <span className="text-sm text-gray-600">{count} Subscribers</span>
    </div>
  );
};

export default SubscribeButton;
