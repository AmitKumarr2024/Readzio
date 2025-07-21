import React from "react";
import { Helmet } from "react-helmet";
import SpaceBackground from "../Utils/SpaceBackground"; // adjust if needed

const AboutPage = () => {
  const version = "v1.0.0";
  const releaseDate = "July 21, 2025";

  return (
    <SpaceBackground>
      <Helmet>
        <title>About Inksha | A Creative Publishing Platform from India</title>
        <meta
          name="description"
          content="Discover Inksha – a modern publishing platform built in India for bloggers, writers, and curious minds. Designed and engineered by Amit using the MERN stack."
        />
        <meta
          property="og:title"
          content="About Inksha | A Creative Publishing Platform from India"
        />
        <meta
          property="og:description"
          content="Learn about Inksha, its mission, and the story behind its creation — a digital space for writers and readers seeking clarity, creativity, and community."
        />
      </Helmet>

      <div className=" py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-8 sm:p-12 transition-transform hover:scale-[1.02]">
            <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              About Inksha
            </h1>

            <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
              <strong>Inksha</strong> is a modern publishing platform built for
              writers, bloggers, and readers who value thoughtful content and
              seamless digital experiences.
            </p>

            <p className="text-lg mt-6 leading-relaxed text-gray-700 dark:text-gray-300">
              With features like real-time previews, tag filters, category
              exploration, and a clean interface, Inksha makes publishing and
              reading intuitive, accessible, and engaging. The platform is
              built entirely on the robust <strong>MERN stack</strong> and
              reflects a commitment to performance, scalability, and user-first
              design.
            </p>

            <p className="text-lg mt-6 leading-relaxed font-semibold text-gray-800 dark:text-gray-100">
              Designed and engineered in India by <strong>Amit</strong>,
              Inksha represents a blend of technical precision and editorial
              vision — tailored for modern creators and readers across the globe.
            </p>

            <div className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>
                Built with care in India | Powered by MERN Stack
              </p>
              <p className="mt-2">
                Version: <strong>{version}</strong> — Released on{" "}
                <strong>{releaseDate}</strong>
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
