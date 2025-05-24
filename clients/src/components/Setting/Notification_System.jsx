import React from 'react';

const NotificationSettings = ({ notifications, onToggle }) => {
  return (
    <div className="mb-6">
      <label className="block mb-2 font-medium">Email Notifications</label>
      <label className="block">
        <input
          type="checkbox"
          name="notifyComments"
          checked={notifications.notifyComments}
          onChange={onToggle}
          className="mr-2"
        />
        Comments on your posts
      </label>
      <label className="block">
        <input
          type="checkbox"
          name="notifyLikes"
          checked={notifications.notifyLikes}
          onChange={onToggle}
          className="mr-2"
        />
        Likes on your posts
      </label>
      <label className="block">
        <input
          type="checkbox"
          name="notifyFollowers"
          checked={notifications.notifyFollowers}
          onChange={onToggle}
          className="mr-2"
        />
        New followers
      </label>
    </div>
  );
};

export default NotificationSettings;
