import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-slate-800 text-white py-6 rounded-xl w-full">
      <div className="  px-6 flex flex-row md:flex-col gap-6 justify-between items-center">
        

        {/* Right Side */}
        <div className="flex w-full justify-center items-center space-x-4 mt-4 md:mt-0">
          <a href="#" className="hover:underline">
            About
          </a>
          <a href="#" className="hover:underline">
            Contact
          </a>
          <a href="#" className="hover:underline">
            Privacy
          </a>
        </div>
        <div className="text-sm">
          © {new Date().getFullYear()} MyyBlog. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
