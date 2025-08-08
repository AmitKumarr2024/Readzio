import React from "react";
import { Link } from "react-router-dom";
import SpaceBackground from "../Utils/SpaceBackground";
const PrivacyPage = () => {
  return (
    <SpaceBackground>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900/0 pt-28 px-4">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl shadow-xl p-6 sm:p-10">
          <h1 className="text-3xl font-semibold mb-4">Privacy Policy</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Effective Date: May 24, 2025
          </p>

          {/* ✅ inkshaa Definition + Content Type Explanation */}
          <p className="mb-6 text-base text-gray-700 dark:text-gray-300">
            <strong>inkshaa</strong> is a creative digital platform where
            individuals can share, discover, and explore ideas through{" "}
            <strong>blogs, articles, thought pieces, and storytelling</strong>.
            We encourage meaningful expression — from personal experiences and
            how-to guides to opinion pieces and tutorials. Whether you're a
            writer, reader, or learner, inkshaa offers a respectful and open
            space to grow and connect.
          </p>

          <div className="space-y-6 text-base leading-relaxed">
            <h2 className="text-xl font-semibold">1. Information We Collect</h2>
            <p>
              We do not collect personal data unless you voluntarily provide it
              through our contact form. Any submitted information—such as your
              name, email, or message—is used solely for communication and never
              shared with third parties.
            </p>

            <h2 className="text-xl font-semibold">2. Cookies</h2>
            <p>
              This site may use minimal cookies or analytics tools to understand
              usage trends and enhance user experience. We do not intentionally
              store or track personally identifiable information.
            </p>

            <h2 className="text-xl font-semibold">
              3. Embedded Content & Links
            </h2>
            <p>
              Some content on inkshaa may include embedded media (e.g., videos,
              articles) from other websites. Such content may behave as if you
              visited those external sites and may include their own tracking or
              cookies.
            </p>

            <h2 className="text-xl font-semibold">4. Your Rights</h2>
            <p>
              If you've submitted your information and wish for it to be
              deleted, please email us with your request, and we will act
              accordingly.
            </p>

            <h2 className="text-xl font-semibold">5. Updates</h2>
            <p>
              This Privacy Policy may be updated occasionally to reflect changes
              in services, tools, or legal requirements. Please revisit this
              page periodically for any changes.
            </p>

            <h2 className="text-xl font-semibold">6. Contact</h2>
            <p className="text-lg">
              For privacy-related questions, reach out to us at{" "}
              <a
                href="mailto:inkshaa.official@gmail.com"
                className="text-blue-600 underline"
              >
                inkshaa.official@gmail.com
              </a>
              .
            </p>

            <p className="text-lg">
              For more information, please also read our{" "}
              <Link to="/Term&Condition" className="text-blue-600 underline">
                Terms & Conditions
              </Link>
              .
            </p>
          </div>

          <div className="mt-10 text-lg text-gray-500 text-center dark:text-gray-400">
            © {new Date().getFullYear()} inkshaa. All rights reserved.
          </div>
        </div>
      </div>
    </SpaceBackground>
  );
};

export default PrivacyPage;
