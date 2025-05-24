import React from 'react';
import {Link} from "react-router-dom"

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-header-gradient-start  to-header-gradient-end text-white py-6 rounded-xl w-full">
      <div className="  px-6 flex flex-row md:flex-col gap-6 justify-between items-center">
        

        {/* Right Side */}
        <div className="flex w-full justify-center items-center space-x-4 mt-4 md:mt-0">
          <Link to={'/about'} className="hover:underline">
            About
          </Link>
          <Link to={'/contact'} className="hover:underline">
            Contact
          </Link>
          <Link to={'/privacy'} className="hover:underline">
            Privacy
          </Link>
        </div>
        <div className="text-sm">
          © {new Date().getFullYear()} MyyBlog. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
