import React from "react";
import { FaStar } from "react-icons/fa";

// Animated starry background
const SpaceBackground = ({ children }) => {
  return (
    <div className="relative min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="stars">
          {[...Array(100)].map((_, i) => (
            <FaStar
              key={i}
              className="absolute text-gray-900 dark:text-white opacity-70 animate-move-star"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                fontSize: `${Math.random() * 8 + 4}px`,
                animationDuration: `${Math.random() * 20 + 10}s`,
                animationDelay: `${Math.random() * 5}s`,
              }}
              aria-hidden="true"
            />
          ))}
        </div>
        <style jsx>{`
          .stars {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            display: block;
            background: radial-gradient(circle at center, #e2e8f0 0%, #000000 100%) dark:radial-gradient(circle at center, #1a1a3d 0%, #000000 100%);
          }

          @keyframes move-star {
            0% {
              transform: translate(0, 0);
              opacity: 0.7;
            }
            50% {
              opacity: 0.3;
            }
            100% {
              transform: translate(-2000px, 2000px);
              opacity: 0.7;
            }
          }

          .animate-move-star {
            animation: move-star linear infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            .animate-move-star {
              animation: none;
            }
          }
        `}</style>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default SpaceBackground;