import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { updateUser } from "../../store/userSlice";

export default function UserProfileEdit({ user, isAdmin = false, onClose, onUpdateSuccess }) {
  const dispatch = useDispatch();
  const updateLoading = useSelector((state) => state.user.updateLoading);
  const updateSuccess = useSelector((state) => state.user.updateSuccess);
  const updateError = useSelector((state) => state.user.updateError);

  const [form, setForm] = useState({
    name: "",
    email: "",
    gender: "Other",
    location: "",
    profession: "",
    blocked: false,
    avatarFile: null,
    bannerFile: null,
    bio: "",
    banner: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        gender: user.gender || "Other",
        location: user.location || "",
        profession: user.profession || "",
        blocked: user.blocked || false,
        avatarFile: null,
        bannerFile: null,
        bio: user.bio || "",
        banner: user.banner || "",
      });
    }
  }, [user]);

  useEffect(() => {
    if (!updateLoading && updateSuccess) {
      toast.success("Profile updated successfully!");
      if (onUpdateSuccess) onUpdateSuccess();
      if (onClose) onClose();
    }
    if (updateError) {
      toast.error(`Error: ${updateError}`);
    }
  }, [updateLoading, updateSuccess, updateError, onUpdateSuccess, onClose]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "bio" && value.length > 200) {
      toast.error("Bio cannot exceed 200 characters");
      return;
    }
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFile = (e) => {
    const { name, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: files[0],
    }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email) {
      toast.error("Name and Email are required");
      return;
    }

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("email", form.email);
    formData.append("gender", form.gender);
    formData.append("location", form.location);
    formData.append("profession", form.profession);
    formData.append("bio", form.bio);

    if (isAdmin) {
      formData.append("blocked", form.blocked);
    }

    if (form.avatarFile) {
      formData.append("avatar", form.avatarFile);
    }

    if (form.bannerFile) {
      formData.append("banner", form.bannerFile);
    } else if (form.banner) {
      formData.append("banner", form.banner);
    }

    try {
      await dispatch(updateUser(formData)).unwrap();
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
        <p className="text-gray-600">Update your profile details below</p>
      </div>

      {updateError && (
        <div className="mb-4 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
          Error: {updateError}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            disabled={updateLoading}
            className="w-full p-3 rounded-lg bg-[#f0f2f5] focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email *</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            disabled={updateLoading}
            className="w-full p-3 rounded-lg bg-[#f0f2f5] focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Gender</label>
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className="w-full p-3 rounded-lg bg-[#f0f2f5] focus:outline-none"
          >
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            className="w-full p-3 rounded-lg bg-[#f0f2f5] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Profession</label>
          <input
            name="profession"
            value={form.profession}
            onChange={handleChange}
            className="w-full p-3 rounded-lg bg-[#f0f2f5] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bio (max 200 chars)</label>
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            rows={4}
            className="w-full p-3 rounded-lg bg-[#f0f2f5] focus:outline-none"
          />
          <p className="text-sm text-gray-500 mt-1">{form.bio.length}/200</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Avatar Image</label>
          <input
            type="file"
            name="avatarFile"
            accept="image/*"
            onChange={handleFile}
            className="w-full file:bg-blue-50 file:text-blue-600 file:px-4 file:py-2 file:rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Banner Image</label>
          <input
            type="file"
            name="bannerFile"
            accept="image/*"
            onChange={handleFile}
            className="w-full file:bg-blue-50 file:text-blue-600 file:px-4 file:py-2 file:rounded-lg"
          />
        </div>

        {isAdmin && (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="blocked"
              checked={form.blocked}
              onChange={handleChange}
            />
            <label className="text-sm font-medium">Blocked (Admin only)</label>
          </div>
        )}

        <div className="pt-4">
          <button
            onClick={handleSubmit}
            disabled={updateLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
          >
            {updateLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
