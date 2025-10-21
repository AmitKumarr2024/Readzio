import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { updateUser, resetUpdateStatus } from "../../store/userSlice";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const compressImage = async (file) => {
  if (!file) return null;
  if (file.size <= MAX_FILE_SIZE) return file;

  const image = new Image();
  const reader = new FileReader();
  reader.readAsDataURL(file);
  return new Promise((resolve) => {
    reader.onload = (e) => {
      image.src = e.target.result;
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const maxWidth = 800;
        const maxHeight = 800;
        let width = image.width;
        let height = image.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(image, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            // Create a proper File object from the blob with metadata
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          file.type,
          0.7 // Quality
        );
      };
    };
  });
};

export default function UserProfileEdit({ user, isAdmin = false, onClose }) {
  const dispatch = useDispatch();
  const { updateLoading, updateSuccess, updateError } = useSelector(
    (state) => state.user
  );
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    gender: user?.gender || "Other",
    location: user?.location || "",
    profession: user?.profession || "",
    blocked: user?.blocked || false,
    avatar: null,
    banner: null,
    bio: user?.bio || "",
  });
  const toastRef = useRef(false);

  useEffect(() => {
    dispatch(resetUpdateStatus());
  }, [dispatch]);

  useEffect(() => {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      gender: user?.gender || "Other",
      location: user?.location || "",
      profession: user?.profession || "",
      blocked: user?.blocked || false,
      avatarFile: null,
      bannerFile: null,
      bio: user?.bio || "",
    });
  }, [user]);

  useEffect(() => {
    if (updateSuccess && !toastRef.current) {
      toastRef.current = true;
      toast.success("Profile updated successfully!");
      dispatch(resetUpdateStatus());
      onClose?.();
    }
    if (updateError && !toastRef.current) {
      toastRef.current = true;
      toast.error(`Error: ${updateError}`);
      dispatch(resetUpdateStatus());
    }
    return () => {
      toastRef.current = false;
      dispatch(resetUpdateStatus());
    };
  }, [updateSuccess, updateError, onClose, dispatch]);

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

  const handleFile = async (e) => {
    const { name, files } = e.target;
    const file = files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 2MB");
      return;
    }

    const compressedFile = await compressImage(file);
    setForm((prev) => ({
      ...prev,
      [name]: compressedFile || file,
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

    // Only append files if user selected new ones
    if (form.avatar) {
      formData.append("avatar", form.avatar);
    }

    if (form.banner) {
      formData.append("banner", form.banner);
    }

    try {
      await dispatch(updateUser(formData)).unwrap();
    } catch (error) {
      console.error("[UserProfileEdit] Update failed:", error);
    }
  };

  return (
    <div className="relative min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-6 sm:p-8 max-w-3xl mx-auto rounded-xl shadow-lg">
      {updateLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <svg
            className="animate-spin h-8 w-8 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Profile</h1>
        <p className="text-text-secondary-light dark:text-text-secondary-dark mt-2">
          Update your profile details below
        </p>
      </div>

      {updateError && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg text-sm">
          Error: {updateError}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Name *
          </label>
          <input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            disabled={updateLoading}
            className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
            required
            aria-required="true"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            disabled={updateLoading}
            className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
            required
            aria-required="true"
          />
        </div>

        <div>
          <label htmlFor="gender" className="block text-sm font-medium mb-1">
            Gender
          </label>
          <select
            id="gender"
            name="gender"
            value={form.gender}
            onChange={handleChange}
            disabled={updateLoading}
            className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium mb-1">
            Location
          </label>
          <input
            id="location"
            name="location"
            value={form.location}
            onChange={handleChange}
            disabled={updateLoading}
            className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
          />
        </div>

        <div>
          <label
            htmlFor="profession"
            className="block text-sm font-medium mb-1"
          >
            Profession
          </label>
          <input
            id="profession"
            name="profession"
            value={form.profession}
            onChange={handleChange}
            disabled={updateLoading}
            className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
          />
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-1">
            Bio (max 200 chars)
          </label>
          <textarea
            id="bio"
            name="bio"
            value={form.bio}
            onChange={handleChange}
            rows={4}
            disabled={updateLoading}
            className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
            aria-describedby="bio-counter"
          />
          <p
            id="bio-counter"
            className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1"
          >
            {form.bio.length}/200
          </p>
        </div>

        <div>
          <label
            htmlFor="avatarFile"
            className="block text-sm font-medium mb-1"
          >
            Avatar Image (max 2MB)
          </label>
          <input
            id="avatarFile"
            type="file"
            name="avatar"
            accept="image/*"
            onChange={handleFile}
            disabled={updateLoading}
            className="w-full file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-600 dark:file:text-blue-300 file:px-4 file:py-2 file:rounded-lg file:border-0 text-text-main-light dark:text-text-main-dark"
          />
        </div>

        <div>
          <label
            htmlFor="bannerFile"
            className="block text-sm font-medium mb-1"
          >
            Banner Image (max 2MB)
          </label>
          <input
            id="bannerFile"
            type="file"
            name="banner"
            accept="image/*"
            onChange={handleFile}
            disabled={updateLoading}
            className="w-full file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-600 dark:file:text-blue-300 file:px-4 file:py-2 file:rounded-lg file:border-0 text-text-main-light dark:text-text-main-dark"
          />
        </div>

        {isAdmin && (
          <div className="flex items-center space-x-2">
            <input
              id="blocked"
              type="checkbox"
              name="blocked"
              checked={form.blocked}
              onChange={handleChange}
              disabled={updateLoading}
              className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <label htmlFor="blocked" className="text-sm font-medium">
              Blocked (Admin only)
            </label>
          </div>
        )}

        <div className="pt-4 flex space-x-4">
          <button
            onClick={handleSubmit}
            disabled={updateLoading}
            className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-busy={updateLoading}
          >
            {updateLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
          <button
            onClick={() => {
              toast("Changes discarded", { icon: "ℹ️" });
              onClose?.();
            }}
            disabled={updateLoading}
            className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-text-main-light dark:text-text-main-dark px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
