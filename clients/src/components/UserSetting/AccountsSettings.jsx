import React from "react";

const AccountsSettings = () => {
  return (
    <div>
      <h2>Account Settings</h2>
      <p>Update your email, password and other account details here.</p>
      <form>
        <label>
          Email:
          <input type="email" defaultValue="user@example.com" style={{ marginLeft: 8, padding: 4 }} />
        </label>
        <br /><br />
        <label>
          Password:
          <input type="password" placeholder="New password" style={{ marginLeft: 8, padding: 4 }} />
        </label>
        <br /><br />
        <button type="submit" style={{ backgroundColor: "#3b82f6", color: "white", padding: "8px 16px", border: "none", borderRadius: 4 }}>
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default AccountsSettings;
