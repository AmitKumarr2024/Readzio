import React from 'react';

const ProfileVisibilitySettings = ({ visibility, onChange }) => {
  return (
    <div className="mb-6">
      <label className="block mb-2 font-medium">Profile Visibility</label>
      <select
        name="profileVisibility"
        value={visibility}
        onChange={onChange}
        className="w-full p-2 border rounded"
      >
        <option value="public">Public</option>
        <option value="private">Private</option>
      </select>
    </div>
  );
};

export default ProfileVisibilitySettings;
