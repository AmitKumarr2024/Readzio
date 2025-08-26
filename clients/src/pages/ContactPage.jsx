import React from "react";
import { Link } from "react-router-dom";
import SpaceBackground from "../Utils/SpaceBackground";

const ContactPage = () => {
  return (
    <SpaceBackground>
      <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark py-12 px-6 md:px-20 lg:px-40">
        <div className="max-w-4xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold mb-6">
            Contact & Merchant Information
          </h1>

          <p className="mb-4">
            You may contact us using the information below, or{" "}
            <Link
              to="/contact"
              className="text-blue-600 hover:underline font-semibold"
            >
              send us a message directly
            </Link>
            .
          </p>

          <div className="mb-4 space-y-2">
            <p>
              <strong>Merchant Legal Entity Name:</strong> Amit Kumar
            </p>
            <p>
              <strong>Registered Address:</strong> 24/5 DLF-Phase 3, Gurgaon,
              HARYANA 122010
            </p>
            <p>
              <strong>Operational Address:</strong> 24/5 DLF-Phase 3, Gurgaon,
              HARYANA 122010
            </p>
            <p>
              <strong>Telephone No:</strong> +91 76349 95261
            </p>
            <p>
              <strong>Email ID:</strong>{" "}
              <a
                href="mailto:inksha.official@gmail.com"
                className="text-blue-600 underline"
              >
                inksha.official@gmail.com
              </a>
            </p>
          </div>

          <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Amit Kumar. All rights reserved.
          </p>
        </div>
      </div>
    </SpaceBackground>
  );
};

export default ContactPage;
