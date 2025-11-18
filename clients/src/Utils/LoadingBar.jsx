import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LoadingBar = ({ loading, text = "Loading..." }) => {
  const [progress, setProgress] = useState(0);
  const [particles, setParticles] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (loading) {
      setProgress(0);

      // ✅ REDUCED particles from 50 → 12 for better performance
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        speed: Math.random() * 2 + 1,
        delay: Math.random() * 2,
      }));
      setParticles(newParticles);

      // Simulate progress
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return Math.min(prev + Math.random() * 15, 100);
        });
      }, 300);

      return () => clearInterval(interval);
    }
  }, [loading]);

  // ✅ OPTIMIZED canvas animation - reduced to 30fps for mobile performance
  useEffect(() => {
    if (!loading || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    let animationId;
    let hue = 0;
    let lastTime = 0;

    const animate = (currentTime) => {
      // ✅ Limit to 30 FPS for mobile performance
      if (currentTime - lastTime < 1000 / 30) {
        animationId = requestAnimationFrame(animate);
        return;
      }
      lastTime = currentTime;

      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw orbiting particles
      hue += 0.5;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const time = Date.now() * 0.001;

      // ✅ REDUCED from 8 → 5 particles for better performance
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + time;
        const radius = 100 + Math.sin(time * 2 + i) * 15;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 12);
        gradient.addColorStop(
          0,
          `hsla(${(hue + i * 72) % 360}, 100%, 60%, 0.6)`
        );
        gradient.addColorStop(1, `hsla(${(hue + i * 72) % 360}, 100%, 60%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate(0);

    return () => cancelAnimationFrame(animationId);
  }, [loading]);

  if (!loading) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 bg-black z-[9999]"
      />
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 50%, #000000 100%)",
        }}
      >
        {/* Animated canvas background */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.5 }}
        />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />

        {/* Floating particles */}
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600"
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            animate={{
              y: [0, -80, 0],
              opacity: [0, 0.8, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: particle.speed * 3,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* ✅ Main content container - pointer-events-auto allows interaction */}
        <div className="relative z-10 flex flex-col items-center pointer-events-auto px-4">
          {/* Logo container with 3D effect */}
          <motion.div
            className="relative mb-10 sm:mb-12"
            animate={{
              rotateY: [0, 360],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              transformStyle: "preserve-3d",
              perspective: 1000,
            }}
          >
            {/* Glow rings around logo */}
            <motion.div
              className="absolute inset-0 -m-6 sm:-m-8"
              animate={{
                rotate: 360,
                scale: [1, 1.15, 1],
              }}
              transition={{
                rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              <div className="w-full h-full rounded-full border-2 sm:border-4 border-cyan-500/20 blur-sm" />
            </motion.div>

            <motion.div
              className="absolute inset-0 -m-8 sm:-m-12"
              animate={{
                rotate: -360,
                scale: [1, 1.25, 1],
              }}
              transition={{
                rotate: { duration: 6, repeat: Infinity, ease: "linear" },
                scale: {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                },
              }}
            >
              <div className="w-full h-full rounded-full border-2 sm:border-4 border-purple-500/20 blur-sm" />
            </motion.div>

            {/* Logo with multiple layers */}
            <motion.div
              className="relative"
              animate={{
                scale: [1, 1.08, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {/* Shadow layers for 3D depth */}
              <div className="absolute inset-0 blur-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 opacity-40 rounded-full" />

              <motion.div
                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 sm:border-4 border-white/10 shadow-2xl backdrop-blur-sm"
                style={{
                  boxShadow:
                    "0 0 40px rgba(6, 182, 212, 0.4), 0 0 80px rgba(147, 51, 234, 0.2)",
                }}
              >
                {/* Fallback gradient if logo doesn't load */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 animate-pulse" />

                {/* Your logo */}
                <img
                  src="/logo.png"
                  alt="Loading"
                  className="w-full h-full object-cover relative z-10"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </motion.div>

              {/* Orbiting elements - REDUCED from 3 to 3 but smaller */}
              {[0, 120, 240].map((angle, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 sm:w-3 sm:h-3 rounded-full"
                  style={{
                    top: "50%",
                    left: "50%",
                    marginLeft: -4,
                    marginTop: -4,
                  }}
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                    delay: i * 0.3,
                  }}
                >
                  <div
                    style={{
                      transform: `rotate(${angle}deg) translateX(60px)`,
                    }}
                    className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/50"
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Loading text with glitch effect */}
          <motion.div
            className="mb-6 sm:mb-8 text-center"
            animate={{
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 mb-2 px-4">
              {text}
            </h2>
            <motion.div
              className="flex justify-center gap-2"
              animate={{
                opacity: [1, 0.4, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [1, 0.3, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          </motion.div>

          {/* Progress bar with liquid effect */}
          <div className="w-full max-w-[280px] sm:max-w-xs md:max-w-sm">
            <div className="relative h-2 sm:h-3 bg-gray-900/50 rounded-full overflow-hidden backdrop-blur-sm border border-gray-700/30 shadow-inner">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 rounded-full"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                }}
                transition={{
                  duration: 0.3,
                }}
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  animate={{
                    x: ["-100%", "200%"],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </motion.div>

              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 blur-lg bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 opacity-40"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                }}
              />
            </div>

            {/* Progress percentage */}
            <motion.p
              className="text-center mt-3 sm:mt-4 text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500"
              key={Math.floor(progress)}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.3 }}
            >
              {Math.floor(Math.min(progress, 100))}%
            </motion.p>
          </div>

          {/* Additional decorative text */}
          <motion.p
            className="mt-6 text-xs sm:text-sm text-gray-500 font-light tracking-wider"
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            Preparing your experience...
          </motion.p>
        </div>

        {/* Edge glow effects */}
        <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent blur-sm" />
        <div className="absolute bottom-0 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent blur-sm" />

        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-transparent blur-2xl" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-purple-500/10 to-transparent blur-2xl" />
      </motion.div>
    </AnimatePresence>
  );
};

export default LoadingBar;
