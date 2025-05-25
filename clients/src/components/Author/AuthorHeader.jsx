import React from "react";
import { motion } from "framer-motion";
import { CgWebsite } from "react-icons/cg";
import {
  FaTwitter,
  FaGithub,
  FaLinkedin,
  FaUser,
  FaEnvelope,
  FaVenusMars,
  FaMapMarkerAlt,
  FaBriefcase,
  FaPen,
} from "react-icons/fa";

const AuthorHeader = ({ author, onEditClick }) => {
  const avatarFallback =
    "https://img.freepik.com/premium-vector/avatar-profile-icon-flat-style-male-user-profile-vector-illustration-isolated-background-man-profile-sign-business-concept_157943-38764.jpg?semt=ais_hybrid&w=740";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white shadow-lg rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center md:items-start"
    >
      {/* Profile Picture */}
      <motion.div
        whileHover={{ scale: 1.05, rotate: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="h-36 w-36 md:h-44 md:w-44 rounded-full overflow-hidden border-2 border-blue-500 shadow-md"
      >
        <img
          src={author?.avatar || avatarFallback}
          alt={author?.name || "Author"}
          className="h-full w-full object-cover"
        />
      </motion.div>

      {/* Author Info */}
      <motion.div
        className="flex flex-col flex-1 gap-2 w-full md:w-auto"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {/* Name and Button */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">
              {author?.name || "Unnamed Author"}
            </h2>
            <p className="text-sm text-gray-600 italic">@{author?.username}</p>
          </div>
          <button
            onClick={onEditClick}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            aria-label="Edit Profile"
          >
            Edit Profile
          </button>
        </div>

        {/* Bio */}
        <p className="mt-2 text-gray-700">{author?.bio || "No bio available."}</p>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-gray-700 font-medium text-sm">
          <div className="flex items-center gap-2">
            <FaEnvelope className="text-blue-600" />
            <span>{author?.email || "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <CgWebsite className="text-blue-600" />
            <a
              href={author?.website || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-700"
            >
              {author?.website ? new URL(author.website).hostname : "-"}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <FaVenusMars className="text-blue-600" />
            <span>{author?.gender || "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <FaMapMarkerAlt className="text-blue-600" />
            <span>{author?.location || "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <FaBriefcase className="text-blue-600" />
            <span>{author?.profession || "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <FaUser className="text-blue-600" />
            <span>Joined: {author?.joinedDate || "-"}</span>
          </div>
        </div>

        {/* Social Icons */}
        <div className="flex gap-5 text-2xl mt-6 text-gray-600">
          {author?.social?.website && (
            <a
              href={author.social.website}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Website"
            >
              <CgWebsite />
            </a>
          )}
          {author?.social?.twitter && (
            <a
              href={`https://twitter.com/${author.social.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
            >
              <FaTwitter className="text-blue-400" />
            </a>
          )}
          {author?.social?.github && (
            <a
              href={`https://github.com/${author.social.github}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <FaGithub />
            </a>
          )}
          {author?.social?.linkedin && (
            <a
              href={`https://linkedin.com/in/${author.social.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
            >
              <FaLinkedin className="text-blue-700" />
            </a>
          )}
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-6 mt-6 text-sm text-gray-800 font-semibold">
          <span>📝 {author?.postsCount || 0} Posts</span>
          <span>👥 {author?.followers || 0} Followers</span>
          <span>🔔 {author?.subscribers || 0} Subscribers</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AuthorHeader;
