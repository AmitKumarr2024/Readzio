import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LoadingBar = ({ loading, text = "Loading..." }) => {
  const [progress, setProgress] = useState(0);
  const [particles, setParticles] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (loading) {
      setProgress(0);

      // Generate particles
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
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
          return prev + Math.random() * 15;
        });
      }, 300);

      return () => clearInterval(interval);
    }
  }, [loading]);

  // Canvas animation for glow effect
  useEffect(() => {
    if (!loading || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    let animationId;
    let hue = 0;

    const animate = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw orbiting particles
      hue += 0.5;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const time = Date.now() * 0.001;

      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + time;
        const radius = 120 + Math.sin(time * 2 + i) * 20;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 15);
        gradient.addColorStop(
          0,
          `hsla(${(hue + i * 45) % 360}, 100%, 60%, 0.8)`
        );
        gradient.addColorStop(1, `hsla(${(hue + i * 45) % 360}, 100%, 60%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [loading]);

  if (!loading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
        style={{
          background:
            "radial-gradient(circle at center, #0a0a0a 0%, #000000 100%)",
        }}
      >
        {/* Animated canvas background */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.6 }}
        />

        {/* Floating particles */}
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-gradient-to-br from-cyan-400 to-blue-600"
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
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

        {/* Main content container */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Logo container with 3D effect */}
          <motion.div
            className="relative mb-12"
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
              className="absolute inset-0 -m-8"
              animate={{
                rotate: 360,
                scale: [1, 1.2, 1],
              }}
              transition={{
                rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              <div className="w-full h-full rounded-full border-4 border-cyan-500/30 blur-sm" />
            </motion.div>

            <motion.div
              className="absolute inset-0 -m-12"
              animate={{
                rotate: -360,
                scale: [1, 1.3, 1],
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
              <div className="w-full h-full rounded-full border-4 border-purple-500/30 blur-sm" />
            </motion.div>

            {/* Logo with multiple layers */}
            <motion.div
              className="relative"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {/* Shadow layers for 3D depth */}
              <div className="absolute inset-0 blur-2xl bg-gradient-to-br from-cyan-500 to-purple-600 opacity-50 rounded-full" />

              <motion.div
                className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl"
                style={{
                  boxShadow:
                    "0 0 60px rgba(0, 255, 255, 0.5), 0 0 100px rgba(138, 43, 226, 0.3)",
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

              {/* Orbiting elements */}
              {[0, 120, 240].map((angle, i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                  style={{
                    top: "50%",
                    left: "50%",
                    marginLeft: -6,
                    marginTop: -6,
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
                      transform: `rotate(${angle}deg) translateX(80px)`,
                    }}
                    className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-lg"
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Loading text with glitch effect */}
          <motion.div
            className="mb-8 text-center"
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 mb-2">
              {text}
            </h2>
            <motion.div
              className="flex justify-center gap-2"
              animate={{
                opacity: [1, 0.3, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-cyan-400"
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
          <div className="w-60 max-w-[60vw]">
            <div className="relative h-3 bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-gray-700/50">
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
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
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
                className="absolute inset-0 blur-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 opacity-50"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                }}
              />
            </div>

            {/* Progress percentage */}
            <motion.p
              className="text-center mt-4 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500"
              key={Math.floor(progress)}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.3 }}
            >
              {Math.floor(Math.min(progress, 100))}%
            </motion.p>
          </div>
        </div>

        {/* Edge glow effects */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 blur-sm" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50 blur-sm" />
      </motion.div>
    </AnimatePresence>
  );
};

export default LoadingBar;
