import React from "react";

const NotificationsSettings = () => {
  return (
    <div>
      <h2>Notification Preferences</h2>
      <form>
        <label>
          <input type="checkbox" defaultChecked />
          Email me when someone comments on my posts
        </label>
        <br />
        <label>
          <input type="checkbox" />
          Email me about new followers
        </label>
        <br />
        <label>
          <input type="checkbox" defaultChecked />
          Send me weekly blog analytics
        </label>
        <br /><br />
        <button type="submit" style={{ backgroundColor: "#3b82f6", color: "white", padding: "8px 16px", border: "none", borderRadius: 4 }}>
          Save Notifications
        </button>
      </form>
    </div>
  );
};

export default NotificationsSettings;
