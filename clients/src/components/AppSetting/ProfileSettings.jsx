import React from "react";

const ProfileSettings = () => {
  return (
    <div>
      <h2>Profile Settings</h2>
      <p>Update your profile information and avatar.</p>
      <form>
        <label>
          Display Name:
          <input type="text" defaultValue="John Bloggs" style={{ marginLeft: 8, padding: 4 }} />
        </label>
        <br /><br />
        <label>
          Bio:
          <textarea defaultValue="Blogger and content creator." rows={4} style={{ display: "block", width: "100%", padding: 4, marginTop: 4 }} />
        </label>
        <br />
        <button type="submit" style={{ backgroundColor: "#3b82f6", color: "white", padding: "8px 16px", border: "none", borderRadius: 4 }}>
          Save Profile
        </button>
      </form>
    </div>
  );
};

export default ProfileSettings;
