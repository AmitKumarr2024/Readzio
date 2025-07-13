import React from "react";
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
    <section className="relative bg-gradient-to-r from-background-light to-gray-200 dark:from-background-dark dark:to-gray-800 text-text-main-light dark:text-text-main-dark min-h-[200px] sm:min-h-[250px] md:min-h-[270px] flex flex-col justify-center items-center px-4 sm:px-6 md:px-10 py-10 sm:py-14">
      {/* Decorative circles */}
      <div className="absolute top-6 left-6 sm:top-10 sm:left-10 w-16 sm:w-24 h-16 sm:h-24 bg-pink-400 rounded-full opacity-30 animate-pulse blur-3xl"></div>
      <div className="absolute bottom-10 right-6 sm:bottom-20 sm:right-20 w-20 sm:w-32 h-20 sm:h-32 bg-indigo-400 rounded-full opacity-30 animate-pulse blur-3xl"></div>

      <motion.div
        className="max-w-2xl sm:max-w-3xl text-center z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="text-3xl sm:text-5xl md:text-6xl font-extrabold mb-4 sm:mb-6 drop-shadow-lg leading-tight"
          variants={itemVariants}
        >
          Welcome to{" "}
          <span className="text-yellow-300 underline decoration-yellow-300 decoration-4 underline-offset-4 sm:underline-offset-8">
            MyyBlog
          </span>
        </motion.h1>
        <motion.p
          className="text-base sm:text-lg md:text-xl max-w-md sm:max-w-xl mx-auto text-center"
          variants={itemVariants}
        >
          Read the latest news, stories, tips, and ideas that inspire and help you every day.
        </motion.p>
      </motion.div>
    </section>
  );
};

export default HeroSection;