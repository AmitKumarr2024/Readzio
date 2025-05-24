import React from 'react';

const ContentPreferences = ({ postVisibility, onChange }) => {
  return (
    <div className="mb-6">
      <label className="block mb-2 font-medium">Default Post Visibility</label>
      <select
        name="defaultPostVisibility"
        value={postVisibility}
        onChange={onChange}
        className="w-full p-2 border rounded"
      >
        <option value="public">Public</option>
        <option value="private">Private</option>
        <option value="draft">Draft</option>
      </select>
    </div>
  );
};

export default ContentPreferences;
