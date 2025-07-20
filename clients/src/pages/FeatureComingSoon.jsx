import React from "react";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 80, damping: 15, duration: 0.7 }
  },
  exit: { opacity: 0, y: -50, transition: { duration: 0.3 } }
};

const textVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.3, duration: 0.5 }
  })
};

// Displays coming soon placeholder
const FeatureComingSoon = () => {
  return (
    <motion.div
      className="container max-w-screen"
      style={{
        height: "91vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "#f0f4f8",
        padding: 20,
        textAlign: "center",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: "#1e293b"
      }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.h1
        style={{ fontSize: "3.5rem", marginBottom: 10, fontWeight: "700" }}
        variants={textVariants}
        custom={0}
      >
        🚧 Coming Soon!
      </motion.h1>

      <motion.p
        style={{ fontSize: "1.25rem", maxWidth: 450, marginBottom: 20, lineHeight: 1.5 }}
        variants={textVariants}
        custom={1}
      >
        We are working hard to bring this amazing feature to your blog. Stay tuned for updates!
      </motion.p>

      <motion.div
        variants={textVariants}
        custom={2}
        style={{
          marginTop: 30,
          padding: "12px 28px",
          backgroundColor: "#3b82f6",
          color: "white",
          borderRadius: 6,
          cursor: "pointer",
          fontWeight: 600,
          userSelect: "none",
          boxShadow: "0 8px 15px rgba(59, 130, 246, 0.3)"
        }}
        whileHover={{ scale: 1.05, boxShadow: "0 12px 20px rgba(59, 130, 246, 0.5)" }}
        whileTap={{ scale: 0.95 }}
        onClick={() => window.location.href = "/"}
      >
        Go Back Home
      </motion.div>
    </motion.div>
  );
};

export default FeatureComingSoon;