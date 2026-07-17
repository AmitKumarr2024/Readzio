import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import SpaceBackground from "../Utils/SpaceBackground";
import { FaXTwitter } from "react-icons/fa6";

const AboutPage = () => {
  const version = "v2.2.0";
  const releaseDate = "July 21, 2025";

  return (
    <SpaceBackground>
      <Helmet>
        <title>
          Readzio – Write Ideas, Get Feedback & Vote in Polls| Write, Discuss & Get
          Feedback | Readzio
        </title>

        <meta
          name="description"
          content="Readzio is a free real-time reading and discussion platform where users write articles, join live conversations, vote in polls, and get instant feedback on ideas."
        />

        <link rel="canonical" href="https://readzio.com/about" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="Real-Time Reading & Discussion Platform | Readzio"
        />
        <meta
          property="og:description"
          content="Write ideas, get instant feedback, vote in polls, and join live discussions on Readzio."
        />
        <meta property="og:url" content="https://readzio.com/about" />
        <meta property="og:image" content="https://readzio.com/logo.png" />

        {/* X Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Real-Time Reading & Discussion Platform | Readzio"
        />
        <meta
          name="twitter:description"
          content="Write ideas, get instant feedback, vote in polls, and join live discussions on Readzio."
        />
        <meta name="twitter:image" content="https://readzio.com/logo.png" />
      </Helmet>

      <div className="min-h-[600px] py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-8 sm:p-12 transition-transform hover:scale-[1.02]">
            <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              About readzio
            </h1>

            <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
              <strong>readzio</strong> is a{" "}
              <strong>
                free, discussion-first reading and writing platform
              </strong>{" "}
              where ideas don’t just get published — they get responses, votes,
              and real-time discussion.
            </p>

            <p className="text-lg mt-6 leading-relaxed text-gray-700 dark:text-gray-300">
              Whether you want to explain an idea, ask a question, or write
              about something you care about, readzio lets real people respond
              instantly while they are online.
            </p>

            <p className="text-lg mt-6 leading-relaxed text-gray-700 dark:text-gray-300">
              Unlike traditional blogging platforms, readzio is built for
              interaction. Readers can comment in real time, vote in polls
              inside articles, save posts to their personal reading list, and
              control what they see by selecting or removing categories they
              care about.
            </p>

            <h2 className="text-2xl font-semibold mt-10 mb-4 text-gray-800 dark:text-white">
              How Readzio Helps Ideas Grow
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
                <strong>Real-Time Feedback:</strong> Comments, votes, bookmarks,
                and reactions update instantly.
              </li>
              <li>
                <strong>Live Online Users:</strong> See how many people are
                currently active and join conversations when readers are online.
              </li>
              <li>
                <strong>Tag & Category Filters:</strong> Discover posts by
                topics you care about.
              </li>
              <li>
                <strong>Shareable Links:</strong> Share content directly via
                social platforms.
              </li>
              <li>
                <strong>Bookmark Posts:</strong> Save your favorite reads to
                revisit anytime.
              </li>
              <li>
                <strong>Dark Mode:</strong> Auto and manual dark theme toggle
                for reading comfort.
              </li>
              <li>
                <strong>Mobile-First Design:</strong> Fully responsive across
                all devices.
              </li>
            </ul>

            <p className="text-lg mt-8 leading-relaxed font-medium text-gray-800 dark:text-gray-100">
              readzio is independently built and maintained by{" "}
              <strong>Amit</strong>, with a mission to turn reading into
              conversation and writing into collaboration.
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
