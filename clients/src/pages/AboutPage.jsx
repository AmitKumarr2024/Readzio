import React from "react";
import { Helmet } from "react-helmet";
import SpaceBackground from "../Utils/SpaceBackground";

const AboutPage = () => {
  const version = "v1.0.0";
  const releaseDate = "July 21, 2025";

  return (
    <SpaceBackground>
      <Helmet>
        <title>About Inksha | A Creative Publishing Platform from India</title>
        <meta
          name="description"
          content="Discover Inksha – a modern publishing platform built in India for writers, readers, and digital creators seeking clarity, creativity, and community."
        />
        <meta
          property="og:title"
          content="About Inksha | A Creative Publishing Platform from India"
        />
        <meta
          property="og:description"
          content="Learn about Inksha, its vision, and features — a clean, powerful space for publishing blogs, articles, and stories."
        />
      </Helmet>

      <div className="min-h-[600px] py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-8 sm:p-12 transition-transform hover:scale-[1.02]">
            <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              About Inksha
            </h1>

            <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
              <strong>Inksha</strong> is a creative publishing platform designed for writers, bloggers, and curious minds. Whether you're here to express your ideas, share knowledge, or explore meaningful content — Inksha provides a clean, responsive space that prioritizes clarity and reader engagement.
            </p>

            <p className="text-lg mt-6 leading-relaxed text-gray-700 dark:text-gray-300">
              Based in <strong>India</strong>, Inksha is developed with an emphasis on simplicity, speed, and accessibility — offering a seamless experience across all devices.
            </p>

            <h2 className="text-2xl font-semibold mt-10 mb-4 text-gray-800 dark:text-white">
              Key Features
            </h2>

            <ul className="list-disc list-inside space-y-3 text-gray-700 dark:text-gray-300 text-lg">
              {/* Engagement */}
              <li><strong>One-Click Likes:</strong> Let readers quickly show appreciation for your posts.</li>
              <li><strong>Polls & Voting:</strong> Add interactive polls to engage readers on key topics.</li>
              <li><strong>Nested Comments:</strong> Structured discussions that are easy to follow.</li>

              {/* Media & Interaction */}
              <li><strong>Image Zoom:</strong> Tap to zoom in on high-resolution images within posts.</li>
              <li><strong>Real-Time Updates:</strong> Interactions like likes, votes, and bookmarks update instantly.</li>

              {/* Content Discovery */}
              <li><strong>Tag & Category Filters:</strong> Discover posts by topics or themes with ease.</li>
              <li><strong>Shareable Links:</strong> Share content directly via social or copy links.</li>
              <li><strong>Bookmark Posts:</strong> Save your favorite reads to revisit anytime.</li>

              {/* Accessibility */}
              <li><strong>Dark Mode:</strong> Auto and manual dark theme toggle for optimal reading comfort.</li>
              <li><strong>Mobile-First Design:</strong> Fully responsive for smooth use on all screen sizes.</li>
            </ul>

            <p className="text-lg mt-8 leading-relaxed font-medium text-gray-800 dark:text-gray-100">
              Inksha is independently built and maintained by <strong>Amit</strong>, with a mission to make modern publishing simple, expressive, and enjoyable for everyone.
            </p>

            <div className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>Built in India with care and intention</p>
              <p className="mt-2">
                Version: <strong>{version}</strong> — Released on <strong>{releaseDate}</strong>
              </p>
              <p className="mt-2">© {new Date().getFullYear()} Inksha. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </SpaceBackground>
  );
};

export default AboutPage;
