import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark py-6 w-full rounded-xl">
      <div className="px-6 flex flex-col items-center justify-between gap-4 text-sm">
        
        {/* Navigation Links */}
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/about" className="hover:underline">
            About
          </Link>
          <Link to="/contact" className="hover:underline">
            Contact
          </Link>
          <Link to="/privacy" className="hover:underline">
            Privacy
          </Link>
        </div>

        {/* Copyright */}
        <div className="text-center md:text-right">
          © {new Date().getFullYear()} <span className="font-semibold">inkshaa</span>. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
