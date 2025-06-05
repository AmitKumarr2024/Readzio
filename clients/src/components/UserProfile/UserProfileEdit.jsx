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
  console.log("updateLoading:", updateLoading, "updateSuccess:", updateSuccess);
  if (!updateLoading && updateSuccess) {
    if (onUpdateSuccess) onUpdateSuccess();
    if (onUpdateSuccess) onUpdateSuccess();
    if (onClose) onClose();
    
  }
}, [updateLoading, updateSuccess, onUpdateSuccess, onClose]);


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
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

  const handleSubmit = async (e) => {
  e.preventDefault();

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
    // wait for the update to finish
    await dispatch(updateUser(formData)).unwrap();

    // call success callback to reload page
    if (onUpdateSuccess) onUpdateSuccess();

    // close modal after success
    if (onClose) onClose();
  } catch (error) {
    // you can handle error here or show toast inside the catch if you want
    console.error("Update failed:", error);
  }
};


  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="relative flex flex-col min-w-0 break-words w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg shadow-lg bg-white border-0">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-pink-500 hover:text-pink-600 text-5xl font-bold"
          aria-label="Close Modal"
          disabled={updateLoading}
        >
          &times;
        </button>

        <div className="rounded-t bg-white mb-0 px-6 py-6">
          <div className="text-center flex justify-between">
            <h6 className="text-blueGray-700 text-4xl font-bold">Edit User </h6>
            
          </div>
        </div>

        <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
          {updateError && (
            <div className="mb-4 text-red-600 font-semibold">
              Error updating profile: {updateError}
            </div>
          )}

          <form onSubmit={handleSubmit} encType="multipart/form-data">
            {/* Name */}
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                disabled={updateLoading}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                disabled={updateLoading}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>

            {/* Gender */}
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2" htmlFor="gender">
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={form.gender}
                onChange={handleChange}
                disabled={updateLoading}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Location */}
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2" htmlFor="location">
                Location
              </label>
              <input
                id="location"
                name="location"
                type="text"
                value={form.location}
                onChange={handleChange}
                disabled={updateLoading}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            {/* Profession */}
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2" htmlFor="profession">
                Profession
              </label>
              <input
                id="profession"
                name="profession"
                type="text"
                value={form.profession}
                onChange={handleChange}
                disabled={updateLoading}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            {/* Bio */}
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2" htmlFor="bio">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={form.bio}
                onChange={handleChange}
                disabled={updateLoading}
                rows={4}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            {/* Avatar File */}
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2" htmlFor="avatarFile">
                Avatar Image
              </label>
              <input
                id="avatarFile"
                name="avatarFile"
                type="file"
                accept="image/*"
                onChange={handleFile}
                disabled={updateLoading}
                className="w-full"
              />
            </div>

            {/* Banner File */}
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2" htmlFor="bannerFile">
                Banner Image
              </label>
              <input
                id="bannerFile"
                name="bannerFile"
                type="file"
                accept="image/*"
                onChange={handleFile}
                disabled={updateLoading}
                className="w-full"
              />
            </div>

            {/* Blocked (admin only) */}
            {isAdmin && (
              <div className="mb-4">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="blocked"
                    checked={form.blocked}
                    onChange={handleChange}
                    disabled={updateLoading}
                    className="form-checkbox"
                  />
                  <span className="ml-2">Blocked</span>
                </label>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end px-4 mt-4">
              <button
                type="submit"
                disabled={updateLoading}
                className="bg-pink-500 text-white active:bg-pink-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none ease-linear transition-all duration-150"
              >
                {updateLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
