import React from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.3,
      duration: 0.8,
      ease: "easeOut",
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { ease: "easeOut", duration: 0.8 } },
};

const HeroSection = () => {
  return (
    <>
      <Helmet>
        <title>inkshaa — A Space to Express</title>
        <meta
          name="description"
          content="inkshaa is a platform for students, writers, and curious minds to explore, share, and grow through meaningful words and ideas."
        />
        <meta
          name="keywords"
          content="inkshaa, blog, student, writer, knowledge, platform, share, learn, express"
        />
        <meta name="author" content="inkshaa Team" />
        <meta property="og:title" content="inkshaa — A Space to Express" />
        <meta
          property="og:description"
          content="Join inkshaa to explore, write, and grow. A community of students, writers, and curious minds."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://inkshaa.in" />
        <meta property="og:image" content="https://inkshaa.in/preview.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="inkshaa — A Space to Express" />
        <meta
          name="twitter:description"
          content="Explore. Share. Grow. Join inkshaa now."
        />
        <meta name="twitter:image" content="https://inkshaa.in/preview.png" />
        <html lang="en" />
      </Helmet>

      <section className="relative bg-gradient-to-r from-background-light to-gray-200 dark:from-background-dark dark:to-gray-800 text-text-main-light dark:text-text-main-dark min-h-[200px] sm:min-h-[250px] md:min-h-[300px] flex flex-col justify-center items-center px-4 sm:px-6 md:px-10 py-10 sm:py-14">
        {/* Decorative circles */}
        <div
          aria-hidden="true"
          className="absolute top-6 left-6 sm:top-10 sm:left-10 
             w-16 sm:w-24 h-16 sm:h-24 bg-pink-400 
             rounded-full opacity-30 animate-pulse blur-3xl"
        ></div>

        <div className="absolute bottom-10 right-6 sm:bottom-20 sm:right-20 w-20 sm:w-32 h-20 sm:h-32 bg-indigo-400 rounded-full opacity-30 animate-pulse blur-3xl"></div>

        <motion.div
          className="max-w-2xl sm:max-w-3xl text-center z-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1
            className="text-3xl sm:text-5xl md:text-7xl font-extrabold mb-4 sm:mb-6 drop-shadow-lg leading-tight"
            initial={{ opacity: 1, y: 0 }} // 👈 visible immediately
            animate={{ opacity: 1, y: 0 }} // 👈 no delay on LCP
            transition={{ duration: 0 }} // 👈 instant
          >
            <span translate="no">Welcome to </span>
            <motion.span
              className="text-yellow-300 underline decoration-yellow-300 decoration-4 underline-offset-4 sm:underline-offset-8 notranslate"
              translate="no"
              lang="en"
              aria-label="inkshaa logo"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              inkshaa
            </motion.span>
          </motion.h1>

          <motion.p
            className="text-base sm:text-lg md:text-2xl max-w-md sm:max-w-xl mx-auto text-center"
            variants={itemVariants}
          >
            A space where students and young minds share, learn, and grow —
            alongside writers from all walks of life.
            <br />
            <span className="font-semibold text-yellow-400">
              Born in India. Built for the world.
            </span>
          </motion.p>
        </motion.div>
      </section>
    </>
  );
};

export default HeroSection;
