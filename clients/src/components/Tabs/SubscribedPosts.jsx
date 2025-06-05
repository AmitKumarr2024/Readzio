// src/components/Post/SubscribedPosts.jsx
import React from "react";

const SubscribedPosts = ({ userId }) => {
  // For demo, let's just show a placeholder message
  return (
    <div>
      <h2>Subscribed Posts for User: {userId}</h2>
      <p>This would list posts subscribed by this user.</p>
    </div>
  );
};

export default SubscribedPosts;
