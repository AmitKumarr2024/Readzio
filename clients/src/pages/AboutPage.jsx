import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import SpaceBackground from "../Utils/SpaceBackground";

// Optional: Add this only if you want the Twitter icon
import { FaXTwitter } from "react-icons/fa6";

const AboutPage = () => {
  const version = "v1.0.0";
  const releaseDate = "July 21, 2025";

  return (
    <SpaceBackground>
      <Helmet>
        <title>
          Free Online Publishing Platform | Publish Articles Online Worldwide &
          India | readzio
        </title>
        <meta
          name="description"
          content="readzio is a free online publishing platform for writers and creators to publish articles, stories, and blogs — open to users worldwide and across India."
        />
        <meta
          name="keywords"
          content="free online publishing platform, publish articles online free, blog publishing platform India, self publishing platform writers, creative publishing platform"
        />
        <meta
          property="og:title"
          content="Free Online Publishing Platform | readzio"
        />
        <meta
          property="og:description"
          content="Publish stories, articles, and blogs globally or in India for free on readzio — a modern content publishing platform for writers and creators."
        />
      </Helmet>

      <div className="min-h-[600px] py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-8 sm:p-12 transition-transform hover:scale-[1.02]">
            <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              About readzio
            </h1>

            <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
              <strong>readzio</strong> is a{" "}
              <strong>free online publishing platform</strong> for creators
              across India and worldwide. Whether you want to{" "}
              <strong>publish articles online free</strong>, share a story, or
              grow as a writer — readzio offers a clean and seamless space to
              connect with your audience.
            </p>

            <p className="text-lg mt-6 leading-relaxed text-gray-700 dark:text-gray-300">
              Developed in <strong>India</strong>, readzio also supports global
              authors and provides <strong>self publishing features</strong> for
              writers, bloggers, and creators across the world. It's a{" "}
              <strong>blog publishing platform India</strong> and a{" "}
              <strong>creative publishing platform worldwide</strong>.
            </p>

            <h2 className="text-2xl font-semibold mt-10 mb-4 text-gray-800 dark:text-white">
              Key Features
            </h2>

            <ul className="list-disc list-inside space-y-3 text-gray-700 dark:text-gray-300 text-lg">
              <li>
                <strong>One-Click Likes:</strong> Let readers quickly show
                appreciation for your posts.
              </li>
              <li>
                <strong>Polls & Voting:</strong> Add interactive polls to engage
                readers on key topics.
              </li>
              <li>
                <strong>Nested Comments:</strong> Structured discussions that
                are easy to follow.
              </li>
              <li>
                <strong>Image Zoom:</strong> Tap to zoom in on high-resolution
                images within posts.
              </li>
              <li>
                <strong>Real-Time Updates:</strong> Interactions like likes,
                votes, and bookmarks update instantly.
              </li>
              <li>
                <strong>Tag & Category Filters:</strong> Discover posts by
                topics or themes with ease.
              </li>
              <li>
                <strong>Shareable Links:</strong> Share content directly via
                social or copy links.
              </li>
              <li>
                <strong>Bookmark Posts:</strong> Save your favorite reads to
                revisit anytime.
              </li>
              <li>
                <strong>Dark Mode:</strong> Auto and manual dark theme toggle
                for optimal reading comfort.
              </li>
              <li>
                <strong>Mobile-First Design:</strong> Fully responsive for
                smooth use on all screen sizes.
              </li>
            </ul>

            <p className="text-lg mt-8 leading-relaxed font-medium text-gray-800 dark:text-gray-100">
              readzio is independently built and maintained by{" "}
              <strong>Amit</strong>, with a mission to make modern publishing
              simple, expressive, and enjoyable for everyone.
            </p>

            <div className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>Built in India with care and intention</p>
              <p className="mt-2">
                Version: <strong>{version}</strong> — Released on{" "}
                <strong>{releaseDate}</strong>
              </p>
              <p className="mt-2">
                © {new Date().getFullYear()} readzio. All rights reserved.
              </p>

              {/* Twitter/X Link */}
              <p className="mt-4 flex items-center justify-center gap-2">
                <FaXTwitter className="text-xl text-blue-600 dark:text-blue-400" />
                <a
                  href="https://x.com/readzioOfficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline font-medium text-blue-600 dark:text-blue-400"
                >
                  Follow us on Twitter/X (@readzioOfficial)
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </SpaceBackground>
  );
};

export default AboutPage;
