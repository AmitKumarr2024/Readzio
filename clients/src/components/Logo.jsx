import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const letters = "MyyBlog".split("");

const waveVariants = {
  initial: { x: -100, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: "tween",
      staggerChildren: 1,    // 1.5 seconds gap between each letter animation start
      delayChildren: 0.1,      // delay before starting animation
    },
  },
};

const letterVariants = {
  initial: { y: 0 },
  animate: {
    y: [0, -2, 0],           // bounce effect (bigger movement)
    transition: { 
      duration: 1,            // 4 seconds per bounce cycle
      ease: "easeInOut", 
      repeat: Infinity,       // repeat forever
      repeatType: "loop"
    },
  },
};

const Logo = () => {
  return (
    <motion.div
      className="text-3xl font-extrabold text-purple-600 cursor-pointer select-none flex"
      variants={waveVariants}
      initial="initial"
      animate="animate"
    >
      {letters.map((letter, index) => (
        <motion.span key={index} variants={letterVariants} className="inline-block text-yellow-400  decoration-yellow-300 shadow-2xl decoration-4  ">
          <Link to="/">{letter}</Link>
        </motion.span>
      ))}
    </motion.div>
  );
};

export default Logo;
