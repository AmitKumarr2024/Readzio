import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const letters = "inksha".split("");

// Variants for each letter (initial bounce)
const letterVariants = {
  initial: { y: 0 },
  animate: {
    y: [0, -8, 0],
    transition: {
      times: [0, 0.5, 1],
      duration: 1,
      ease: "easeInOut",
      repeat: 0, // only bounce once per letter
    },
  },
};

// Group bounce for entire word
const groupVariants = {
  initial: { y: 0 },
  animate: {
    y: [0, -5, 0],
    transition: {
      delay: letters.length * 0.1 + 0.5, // wait for all letters to finish
      duration: 1.5,
      ease: "easeInOut",
      repeat: Infinity,
      repeatDelay: 2,
    },
  },
};

// Error boundary in case logo breaks
class LogoErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("[Logo] Rendering error:", { error, errorInfo });
  }
  render() {
    return this.state.hasError ? (
      <div className="text-red-500">Logo failed to load.</div>
    ) : (
      this.props.children
    );
  }
}

const Logo = () => {
  return (
    <LogoErrorBoundary>
      <motion.div
        className="text-3xl font-extrabold text-purple-600 cursor-pointer select-none flex notranslate"
        translate="no"
        lang="en"
        aria-label="Inksha logo"
        variants={groupVariants}
        initial="initial"
        animate="animate"
      >
        {letters.map((letter, index) => (
          <motion.span
            key={index}
            variants={letterVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: index * 0.1 }}
            className="inline-block text-yellow-400"
          >
            <Link to="/" aria-label={`Logo letter ${letter}`}>
              {letter}
            </Link>
          </motion.span>
        ))}
      </motion.div>
    </LogoErrorBoundary>
  );
};

export default Logo;
