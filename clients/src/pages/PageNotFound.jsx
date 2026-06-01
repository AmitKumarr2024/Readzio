import React from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { FiAlertCircle, FiHome, FiArrowLeft } from "react-icons/fi";

const PageNotFound = () => {
  // Navigation handler helper
  const goBack = () => window.history.back();

  return (
    <>
      <Helmet>
        <title>404 - Page Not Found</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#0a0a0c] px-4 text-white">
        {/* Modern Ambient Fluid Background Orbs */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.2, 0.9, 1],
              x: [0, 80, -40, 0],
              y: [0, -60, 50, 0],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-600/20 blur-[80px] md:h-96 md:w-96"
          />
          <motion.div
            animate={{
              scale: [1, 0.8, 1.1, 1],
              x: [0, -100, 60, 0],
              y: [0, 80, -40, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
            className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/30 blur-[90px] md:h-[500px] md:w-[500px]"
          />
        </div>

        {/* Subtle Grid Overlay for Tech Texturing */}
        <div
          className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#fff 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />

        {/* Main 404 Canvas */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="z-10 w-full max-w-xl text-center"
        >
          {/* Hero Glitch/Glow 404 Header */}
          <div className="relative inline-block select-none">
            <motion.h1
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-b from-white via-neutral-200 to-neutral-500 bg-clip-text text-[100px] font-black leading-none tracking-tighter text-transparent sm:text-[140px] md:text-[180px]"
            >
              404
            </motion.h1>
            {/* Absolute accent element behind the number */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-20 blur-3xl filter" />
          </div>

          {/* Premium Glassmorphic Information Card */}
          <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-md sm:mt-6 sm:p-8 md:p-10 shadow-2xl">
            <div className="flex justify-center">
              <motion.div
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 4,
                  ease: "easeInOut",
                }}
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20"
              >
                <FiAlertCircle className="text-2xl" />
              </motion.div>
            </div>

            <h2 className="mt-4 text-xl font-bold tracking-tight text-neutral-100 sm:text-2xl md:text-3xl">
              Lost in the Digital Ether
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-neutral-400 sm:text-base md:px-4">
              The page you are looking for might have been removed, had its name
              changed, or is temporarily unavailable. Let's get you back on
              track.
            </p>

            {/* Responsive Action Controls */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <button
                onClick={goBack}
                className="group flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900/60 px-5 py-3 text-sm font-medium transition-all duration-200 hover:border-neutral-500 hover:bg-neutral-800 active:scale-95"
              >
                <FiArrowLeft className="transition-transform group-hover:-translate-x-1" />
                Go Back
              </button>

              <a
                href="/"
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3 text-sm font-medium transition-all duration-200 hover:from-indigo-600 hover:to-purple-700 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] active:scale-95 shadow-md"
              >
                <FiHome />
                Return Home
              </a>
            </div>
          </div>

          {/* Minimal Brand Footer Accent */}
          <p className="mt-12 text-xs tracking-widest text-neutral-600 uppercase select-none">
            Error Code: HTTP_NOT_FOUND
          </p>
        </motion.div>
      </div>
    </>
  );
};

export default PageNotFound;
