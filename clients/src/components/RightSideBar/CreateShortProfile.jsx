import React, { useState } from "react";
import { MapPin, CalendarDays } from "lucide-react";
import SubscribeButton from "./SubscribeButton";
import EditShortProfile from "./EditShortProfile";

const defaultProfile = {
  name: "Anonymous",
  avatar:
    "https://img.freepik.com/premium-vector/avatar-profile-icon-flat-style-male-user-profile-vector-illustration-isolated-background-man-profile-sign-business-concept_157943-38764.jpg",
  location: "Unknown",
  profession: "Enthusiast",
  bio: "No bio available.",
  joinedDate: "N/A",
  subscribers: 0,
  social: {},
};

const CreateShortProfile = ({ initialProfile }) => {
  const [profile, setProfile] = useState(initialProfile || defaultProfile);
  const [isEditing, setIsEditing] = useState(false);

  const {
    name,
    avatar,
    location,
    profession,
    bio,
    joinedDate,
    subscribers,
  } = profile;

  const handleSave = (updatedProfile) => {
    setProfile((prev) => ({
      ...prev,
      ...updatedProfile,
      joinedDate: prev.joinedDate, // keep joinedDate unchanged
    }));
    setIsEditing(false);
  };

  return (
    <div className="bg-card-bg shadow-2xl rounded-xl p-6 w-full max-w-md mx-auto flex flex-col items-center gap-4 relative">
      {/* Edit Button */}
      <button
        onClick={() => setIsEditing(true)}
        className="absolute top-2 right-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Edit Profile
      </button>

      {/* Avatar */}
      <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-gray-200 shadow-sm transition-transform hover:scale-105">
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      </div>

      {/* Info */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900">{name}</h3>
        <p className="text-gray-600 text-sm mb-1">💼 {profession}</p>
        <p className="text-gray-700 text-sm italic">{bio}</p>
      </div>

      {/* Extra Meta */}
      <div className="flex flex-col items-center text-sm text-gray-500 gap-1">
        <div className="flex items-center gap-1">
          <MapPin size={14} /> {location}
        </div>
       
      </div>

      {/* Subscribe Button */}
      <SubscribeButton initialCount={subscribers} />

      {/* Modal for editing */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-2">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full relative">
            <button
              onClick={() => setIsEditing(false)}
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 text-xl font-bold"
              aria-label="Close modal"
            >
              &times;
            </button>
            <EditShortProfile initialData={profile} onSave={handleSave} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateShortProfile;
