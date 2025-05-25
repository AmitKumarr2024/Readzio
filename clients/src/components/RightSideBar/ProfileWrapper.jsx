import React, { useState } from "react";
import CreateShortProfile from "./CreateShortProfile";

const ProfileWrapper = () => {
  const [profile, setProfile] = useState({
    name: "Amit Kumar",
    username: "amit_k",
    email: "amit.kumar@example.com",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    location: "New Delhi, India",
    profession: "Full Stack Developer",
    bio: "Passionate about building scalable web apps. Always exploring the latest in MERN stack, UI/UX, and performance tuning.",
    joinedDate: "January 2024",
    social: {
      twitter: "amit_kumar",
      github: "amitkumar",
      linkedin: "amit-kumar",
      website: "https://amitkumar.dev",
    },
    subscribers: 128,
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleSave = (updatedProfile) => {
    setProfile((prev) => ({
      ...prev,
      ...updatedProfile,
      joinedDate: prev.joinedDate, // keep joinedDate same or handle accordingly
    }));
    setIsEditing(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <CreateShortProfile profile={profile} />
    </div>
  );
};

export default ProfileWrapper;
