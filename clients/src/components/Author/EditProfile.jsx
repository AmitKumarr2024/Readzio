import React, { useState, useEffect } from "react";
import {
  FaTwitter,
  FaGithub,
  FaLinkedin,
  FaUser,
  FaUserTag,
  FaEnvelope,
  FaVenusMars,
  FaMapMarkerAlt,
  FaBriefcase,
  FaPen,
} from "react-icons/fa";

const EditProfile = ({ initialData = {}, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    bio: "",
    email: "",
    avatar: "",
    gender: "",
    location: "",
    profession: "",
    joinedDate: "",
    subscribers: 0,
    socialTwitter: "",
    socialGithub: "",
    socialLinkedin: "",
  });

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarInputMode, setAvatarInputMode] = useState("upload"); // "upload" or "url"
  const [avatarUrlInput, setAvatarUrlInput] = useState("");

  useEffect(() => {
    const d = initialData.data || initialData;
    if (d) {
      const social = d.social || {};
      setFormData({
        name: d.name || "",
        username: d.username || "",
        bio: d.bio || "",
        email: d.email || "",
        avatar: d.avatar || "",
        gender: d.gender || "",
        location: d.location || "",
        profession: d.profession || "",
        joinedDate: d.joinedDate || "",
        subscribers: d.subscribers || 0,
        socialTwitter: social.twitter || "",
        socialGithub: social.github || "",
        socialLinkedin: social.linkedin || "",
      });
      setAvatarUrlInput(d.avatar || "");
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Avatar URL input change
  const handleAvatarUrlChange = (e) => {
    setAvatarUrlInput(e.target.value);
  };

  // Confirm avatar URL and close modal
  const confirmAvatarUrl = () => {
    setFormData((prev) => ({ ...prev, avatar: avatarUrlInput }));
    setShowAvatarModal(false);
  };

  // File upload for avatar
  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, avatar: reader.result }));
      setAvatarUrlInput(reader.result);
      setShowAvatarModal(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedData = {
      ...formData,
      social: {
        twitter: formData.socialTwitter,
        github: formData.socialGithub,
        linkedin: formData.socialLinkedin,
      },
    };
    onSave && onSave(updatedData);
  };

  return (
    <div className="max-w-7xl mx-auto w-full bg-white rounded-2xl shadow-xl p-6 mt-10 overflow-y-scroll h-full">
      <h2 className="text-4xl font-bold text-gray-800 mb-8 text-center uppercase tracking-wide">
        Edit Profile
      </h2>
      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Basic Information */}
        <section>
          <h3 className="text-2xl font-bold text-blue-700 border-b-2 border-blue-200 pb-3 mb-6 text-center">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InputField
              label="Name"
              name="name"
              icon={<FaUser />}
              value={formData.name}
              onChange={handleChange}
              placeholder="Your full name"
            />
            <InputField
              label="Username"
              name="username"
              icon={<FaUserTag />}
              value={formData.username}
              onChange={handleChange}
              placeholder="username"
            />
            <TextAreaField
              label="Bio"
              name="bio"
              icon={<FaPen />}
              value={formData.bio}
              onChange={handleChange}
              placeholder="Write a short bio..."
            />
            <InputField
              label="Email"
              name="email"
              icon={<FaEnvelope />}
              value={formData.email}
              onChange={handleChange}
              placeholder="your.email@example.com"
            />

            {/* Avatar preview + button */}
            <div className="lg:col-span-2 flex flex-col items-center gap-4">
              <label className="block text-gray-700 font-semibold mb-2">Avatar</label>
              {formData.avatar ? (
                <img
                  src={formData.avatar}
                  alt="Avatar Preview"
                  className="w-32 h-32 rounded-full object-cover border border-gray-300"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 border border-gray-300">
                  No Avatar
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg"
              >
                Set Avatar
              </button>
            </div>
          </div>
        </section>

        {/* Professional Info */}
        <section>
          <h3 className="text-2xl font-bold text-blue-700 border-b-2 border-blue-200 pb-3 mb-6">
            Professional Information
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gender select */}
            <div>
              <label
                htmlFor="gender"
                className="block text-gray-700 font-semibold mb-2"
              >
                Gender
              </label>
              <div className="flex items-center gap-2">
                <FaVenusMars />
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <InputField
              label="Location"
              name="location"
              icon={<FaMapMarkerAlt />}
              value={formData.location}
              onChange={handleChange}
              placeholder="Your city or location"
            />
            <InputField
              label="Profession"
              name="profession"
              icon={<FaBriefcase />}
              value={formData.profession}
              onChange={handleChange}
              placeholder="Your profession"
              fullWidth
            />
          </div>
        </section>

        {/* Social Links */}
        <section>
          <h3 className="text-2xl font-bold text-blue-700 border-b-2 border-blue-200 pb-3 mb-6">
            Social Links
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
            <InputField
              name="socialTwitter"
              icon={<FaTwitter className="text-blue-400" />}
              value={formData.socialTwitter}
              onChange={handleChange}
              placeholder="Twitter username"
            />
            <InputField
              name="socialGithub"
              icon={<FaGithub />}
              value={formData.socialGithub}
              onChange={handleChange}
              placeholder="GitHub username"
            />
            <InputField
              name="socialLinkedin"
              icon={<FaLinkedin className="text-blue-700" />}
              value={formData.socialLinkedin}
              onChange={handleChange}
              placeholder="LinkedIn username"
            />
          </div>
        </section>

        <button
          type="submit"
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-11/12 max-w-md bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-bold py-4 rounded-xl shadow-lg transition-all duration-300 z-50"
        >
          Save Changes
        </button>
      </form>

      {/* Avatar Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/50  flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full relative">
            <button
              onClick={() => setShowAvatarModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl font-bold"
              aria-label="Close"
            >
              &times;
            </button>

            <h3 className="text-xl font-semibold mb-4">Set Avatar</h3>

            <div className="flex gap-4 mb-6">
              <button
                className={`px-4 py-2 rounded ${
                  avatarInputMode === "upload"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200"
                }`}
                onClick={() => setAvatarInputMode("upload")}
              >
                Upload Image
              </button>
              <button
                className={`px-4 py-2 rounded ${
                  avatarInputMode === "url"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200"
                }`}
                onClick={() => setAvatarInputMode("url")}
              >
                Enter URL
              </button>
            </div>

            {avatarInputMode === "upload" && (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="block w-full"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Upload an image file from your computer.
                </p>
              </div>
            )}

            {avatarInputMode === "url" && (
              <div>
                <input
                  type="text"
                  value={avatarUrlInput}
                  onChange={handleAvatarUrlChange}
                  placeholder="Paste image URL here"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
                <button
                  onClick={confirmAvatarUrl}
                  disabled={!avatarUrlInput.trim()}
                  className={`mt-3 w-full py-2 rounded text-white font-semibold ${
                    avatarUrlInput.trim()
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  Confirm URL
                </button>
              </div>
            )}

            {formData.avatar && (
              <div className="mt-6 flex justify-center">
                <img
                  src={formData.avatar}
                  alt="Avatar Preview"
                  className="w-24 h-24 rounded-full object-cover border border-gray-300"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const InputField = ({
  label,
  name,
  icon,
  value,
  onChange,
  placeholder,
  fullWidth,
}) => (
  <div className={fullWidth ? "col-span-2" : ""}>
    {label && (
      <label htmlFor={name} className="block text-gray-700 font-semibold mb-2">
        {label}
      </label>
    )}
    <div className="flex items-center border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      <div className="text-gray-400 mr-3">{icon}</div>
      <input
        id={name}
        name={name}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full focus:outline-none bg-transparent"
      />
    </div>
  </div>
);

const TextAreaField = ({ label, name, icon, value, onChange, placeholder }) => (
  <div className="col-span-2">
    {label && (
      <label htmlFor={name} className="block text-gray-700 font-semibold mb-2">
        {label}
      </label>
    )}
    <div className="flex items-start border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      <div className="text-gray-400 mr-3 mt-1">{icon}</div>
      <textarea
        id={name}
        name={name}
        rows={4}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full focus:outline-none resize-none bg-transparent"
      />
    </div>
  </div>
);

export default EditProfile;
