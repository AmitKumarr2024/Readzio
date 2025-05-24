import React from "react";
import { motion } from "framer-motion";

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
              {author?.name || "Author Name"}
            </h2>
            <p className="text-gray-500 text-sm">@{author?.username || "username"}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            onClick={onEditClick}
            className="self-start sm:self-auto bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition"
          >
            ✏️ Edit Profile
          </motion.button>
        </div>

        {/* Bio */}
        {author?.bio && <p className="text-gray-700 text-sm mt-2">{author.bio}</p>}

        {/* Additional Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-3 text-gray-600 text-sm">
          {author?.email && <span>📧 {author.email}</span>}
          {author?.gender && <span>🚻 {author.gender}</span>}
          {author?.location && <span>📍 {author.location}</span>}
          {author?.profession && <span>💼 {author.profession}</span>}
          <span>📅 Joined: {author?.joinedDate || "January 2024"}</span>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-800 font-medium">
          <span>📝 {author?.postsCount || 0} Posts</span>
          <span>👥 {author?.followers || 0} Followers</span>
        </div>

        {/* Social Links */}
        {author?.social && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-wrap gap-4 mt-4 text-sm"
          >
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
                className="text-gray-900 hover:underline"
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
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default AuthorHeader;
