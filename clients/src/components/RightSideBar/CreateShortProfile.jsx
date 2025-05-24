import React from "react";
import { Link } from "react-router-dom";

const CreateShortProfile = () => {
  const author = {
    name: "Amit Kumar",
    username: "amit_k",
    email: "amit.kumar@example.com",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    location: "New Delhi, India",
    profession: "Full Stack Developer",
    joinedDate: "January 2024",
    social: {
      twitter: "amit_kumar",
      github: "amitkumar",
      linkedin: "amit-kumar",
      website: "https://amitkumar.dev",
    },
  };

  return (
    <Link to={''} className="bg-card-bg shadow rounded-lg p-6 max-w-xs mx-auto min-w-full flex flex-col items-center gap-1 ">
      {/* Avatar at top */}
      <div className="w-56 h-56 rounded-full overflow-hidden border-4 border-gray-100 shadow-sm">
        <img
          src={
            author.avatar ||
            "https://img.freepik.com/premium-vector/avatar-profile-icon-flat-style-male-user-profile-vector-illustration-isolated-background-man-profile-sign-business-concept_157943-38764.jpg"
          }
          alt={author.name || "User"}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info Below Avatar */}
      <div className="w-full text-center">
        <h3 className="text-3xl font-semibold text-gray-800">{author.name}</h3>
        <p className="text-gray-500 text-xl">@{author.username}</p>
        <p className="text-gray-600 text-xl mt-1">📧 {author.email}</p>
        <p className="text-gray-600 text-xl">📍 {author.location}</p>
        <p className="text-gray-600 text-xl">💼 {author.profession}</p>
        <p className="text-gray-600 text-xl">📅 Joined: {author.joinedDate}</p>
      </div>

      {/* Social Links */}
      <div className="flex flex-wrap justify-center gap-1 mt-3 text-lg">
        {author.social.website && (
          <a
            href={author.social.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            🌐 Website
          </a>
        )}
        {author.social.twitter && (
          <a
            href={`https://twitter.com/${author.social.twitter}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            🐦 Twitter
          </a>
        )}
        {author.social.github && (
          <a
            href={`https://github.com/${author.social.github}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-800 hover:underline"
          >
            💻 GitHub
          </a>
        )}
        {author.social.linkedin && (
          <a
            href={`https://linkedin.com/in/${author.social.linkedin}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 hover:underline"
          >
            💼 LinkedIn
          </a>
        )}
      </div>
    </Link>
  );
};

export default CreateShortProfile;
