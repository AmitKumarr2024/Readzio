import React, { useState } from "react";

const EditShortProfile = ({ initialData = {}, onSave }) => {
  // Destructure social safely
  const social = initialData.social || {};

  const [formData, setFormData] = useState({
    name: initialData.name || "",
    profession: initialData.profession || "",
    bio: initialData.bio || "",
    avatar: initialData.avatar || "",
    location: initialData.location || "",
    website: social.website || "",
    linkedin: social.linkedin || "",
    github: social.github || "",
    twitter: social.twitter || "",
    joinedDate: initialData.joinedDate || "", // added joinedDate safely
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedProfile = {
      ...formData,
      social: {
        twitter: formData.twitter,
        github: formData.github,
        linkedin: formData.linkedin,
        website: formData.website,
      },
    };
    onSave(updatedProfile);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg flex flex-col gap-4"
    >
      <h2 className="text-2xl font-semibold text-center mb-2">Edit Profile</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          className="input"
        />
        <input
          name="profession"
          placeholder="Profession"
          value={formData.profession}
          onChange={handleChange}
          className="input"
        />
        <input
          name="location"
          placeholder="Location"
          value={formData.location}
          onChange={handleChange}
          className="input"
        />
        <input
          name="avatar"
          placeholder="Avatar URL"
          value={formData.avatar}
          onChange={handleChange}
          className="input"
        />
      </div>

      <textarea
        name="bio"
        placeholder="Short Bio"
        value={formData.bio}
        onChange={handleChange}
        className="input h-28"
      />

      {/* Display joinedDate safely */}
      {formData.joinedDate && (
        <p className="text-sm text-gray-600">Joined on: {formData.joinedDate}</p>
      )}

      <h3 className="text-lg font-semibold mt-2">Social Links</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          name="website"
          placeholder="Website URL"
          value={formData.website}
          onChange={handleChange}
          className="input"
        />
        <input
          name="linkedin"
          placeholder="LinkedIn"
          value={formData.linkedin}
          onChange={handleChange}
          className="input"
        />
        <input
          name="github"
          placeholder="GitHub"
          value={formData.github}
          onChange={handleChange}
          className="input"
        />
        <input
          name="twitter"
          placeholder="Twitter"
          value={formData.twitter}
          onChange={handleChange}
          className="input"
        />
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
      >
        Save Profile
      </button>
    </form>
  );
};

export default EditShortProfile;
