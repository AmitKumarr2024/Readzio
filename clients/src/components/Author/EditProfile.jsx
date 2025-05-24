import React, { useState } from "react";
import { CgWebsite } from "react-icons/cg";
import {
  FaTwitter,
  FaGithub,
  FaLinkedin,
  FaUser,
  FaUserTag,
  FaEnvelope,
  FaImage,
  FaVenusMars,
  FaMapMarkerAlt,
  FaBriefcase,
  FaPen,
} from "react-icons/fa";

const EditProfile = ({ initialData = {}, onSave }) => {
  const [formData, setFormData] = useState({
    name: initialData.name || "",
    username: initialData.username || "",
    bio: initialData.bio || "",
    email: initialData.email || "",
    website: initialData.website || "",
    avatar: initialData.avatar || "",
    gender: initialData.gender || "",
    location: initialData.location || "",
    profession: initialData.profession || "",
    socialWebsite: initialData.social?.website || "",
    socialTwitter: initialData.social?.twitter || "",
    socialGithub: initialData.social?.github || "",
    socialLinkedin: initialData.social?.linkedin || "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedData = {
      ...formData,
      social: {
        website: formData.socialWebsite,
        twitter: formData.socialTwitter,
        github: formData.socialGithub,
        linkedin: formData.socialLinkedin,
      },
    };
    onSave && onSave(updatedData);
  };

  const inputWrapperClass = "w-full";
  const inputClass =
    "w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const iconInputWrapper = "flex items-center gap-2";

  return (
    <div className="max-w-7xl mx-auto w-full bg-white rounded-2xl shadow-xl p-6 mt-10 overflow-y-scroll h-full">
      <h2 className="text-4xl font-bold text-gray-800 mb-8 text-center uppercase tracking-wide">
        Edit Profile
      </h2>
      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Basic Info Section */}
        <section>
          <h3 className="text-2xl font-bold text-blue-700 border-b-2 border-blue-200 pb-3 mb-6 text-center">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={inputWrapperClass}>
              <label
                htmlFor="name"
                className="block text-gray-700 font-semibold mb-2"
              >
                Name
              </label>
              <div className={iconInputWrapper}>
                <FaUser className="text-gray-600" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Your full name"
                  value={formData.name}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div className={inputWrapperClass}>
              <label
                htmlFor="username"
                className="block text-gray-700 font-semibold mb-2"
              >
                Username
              </label>
              <div className={iconInputWrapper}>
                <FaUserTag className="text-gray-600" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div className={inputWrapperClass + " lg:col-span-2"}>
              <label
                htmlFor="bio"
                className="block text-gray-700 font-semibold mb-2"
              >
                Bio
              </label>
              <div className={iconInputWrapper}>
                <FaPen className="text-gray-600" />
                <textarea
                  id="bio"
                  name="bio"
                  placeholder="Write a short bio..."
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className={inputWrapperClass}>
              <label
                htmlFor="email"
                className="block text-gray-700 font-semibold mb-2"
              >
                Email
              </label>
              <div className={iconInputWrapper}>
                <FaEnvelope className="text-gray-600" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div className={inputWrapperClass}>
              <label
                htmlFor="website"
                className="block text-gray-700 font-semibold mb-2"
              >
                Website
              </label>
              <div className={iconInputWrapper}>
                <CgWebsite className="text-gray-600" />
                <input
                  id="website"
                  name="website"
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={formData.website}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>

            <div className={inputWrapperClass}>
              <label
                htmlFor="avatar"
                className="block text-gray-700 font-semibold mb-2"
              >
                Avatar URL
              </label>
              <div className={iconInputWrapper}>
                <FaImage className="text-gray-600" />
                <input
                  id="avatar"
                  name="avatar"
                  type="url"
                  placeholder="https://avatar.url/image.jpg"
                  value={formData.avatar}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Professional Info Section */}
        <section>
          <h3 className="text-2xl font-bold text-blue-700 border-b-2 border-blue-200 pb-3 mb-6">
            Professional Information
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={inputWrapperClass}>
              <label
                htmlFor="gender"
                className="block text-gray-700 font-semibold mb-2"
              >
                Gender
              </label>
              <div className={iconInputWrapper}>
                <FaVenusMars className="text-gray-600" />
                <input
                  id="gender"
                  name="gender"
                  type="text"
                  placeholder="Male / Female / Other"
                  value={formData.gender}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>

            <div className={inputWrapperClass}>
              <label
                htmlFor="location"
                className="block text-gray-700 font-semibold mb-2"
              >
                Location
              </label>
              <div className={iconInputWrapper}>
                <FaMapMarkerAlt className="text-gray-600" />
                <input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="Your city or location"
                  value={formData.location}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>

            <div className={inputWrapperClass + " lg:col-span-2"}>
              <label
                htmlFor="profession"
                className="block text-gray-700 font-semibold mb-2"
              >
                Profession
              </label>
              <div className={iconInputWrapper}>
                <FaBriefcase className="text-gray-600" />
                <input
                  id="profession"
                  name="profession"
                  type="text"
                  placeholder="Your profession"
                  value={formData.profession}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Social Links Section */}
        <section>
          <h3 className="text-2xl font-bold text-blue-700 border-b-2 border-blue-200 pb-3 mb-6">
            Social Links
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
            <div className={iconInputWrapper}>
              <CgWebsite className="text-gray-600" />
              <input
                name="socialWebsite"
                type="url"
                placeholder="Website URL"
                value={formData.socialWebsite}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className={iconInputWrapper}>
              <FaTwitter className="text-blue-400" />
              <input
                name="socialTwitter"
                type="text"
                placeholder="Twitter username"
                value={formData.socialTwitter}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className={iconInputWrapper}>
              <FaGithub className="text-gray-800" />
              <input
                name="socialGithub"
                type="text"
                placeholder="GitHub username"
                value={formData.socialGithub}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className={iconInputWrapper}>
              <FaLinkedin className="text-blue-700" />
              <input
                name="socialLinkedin"
                type="text"
                placeholder="LinkedIn username"
                value={formData.socialLinkedin}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-11/12 max-w-md bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-bold py-4 rounded-xl shadow-lg transition-all duration-300 z-50"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default EditProfile;
