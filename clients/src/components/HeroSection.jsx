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
    <section className="relative bg-gradient-to-r from-indigo-600 via-purple-700 to-pink-600 text-white h-72 -mt-28 flex flex-col justify-center items-center px-6">
      {/* Decorative circles */}
      <div className="absolute top-10 left-10 w-24 h-24 bg-pink-400 rounded-full opacity-30 animate-pulse blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-32 h-32 bg-indigo-400 rounded-full opacity-30 animate-pulse blur-3xl"></div>

      <motion.div
        className="max-w-4xl text-center z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="text-5xl md:text-7xl font-extrabold mb-6 drop-shadow-lg"
          variants={itemVariants}
        >
          Welcome to{" "}
          <span className="text-yellow-400 underline decoration-yellow-300 decoration-4 underline-offset-8">
            MyyBlog
          </span>
        </motion.h1>
        <motion.p
          className="text-xl md:text-2xl mb-10 max-w-xl mx-auto text-center"
          variants={itemVariants}
        >
          Read the latest news, stories, tips, and ideas that inspire and help
          you every day.
        </motion.p>
      </motion.div>
    </section>
  );
};

export default HeroSection;
