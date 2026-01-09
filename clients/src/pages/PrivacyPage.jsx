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

          {/* ✅ Updated Readzio Definition */}
          <p className="mb-6 text-base text-gray-700 dark:text-gray-300">
            <strong>readzio</strong> is a digital reading and discussion
            platform where individuals can share, discover, and engage with
            ideas through{" "}
            <strong>
              articles, blogs, comments, polls, and real-time interactions
            </strong>
            . The platform encourages thoughtful expression, discussion, and
            learning — allowing users not only to publish content, but also to
            respond, vote, and participate in conversations.
          </p>

          <div className="space-y-6 text-base leading-relaxed">
            <h2 className="text-xl font-semibold">1. Information We Collect</h2>
            <p>
              We collect only the information necessary to operate the platform.
              This may include basic account details (such as username or
              email), content you choose to publish, and interactions such as
              comments, likes, votes, or bookmarks. Information is used solely
              to provide and improve readzio’s services and is never sold to
              third parties.
            </p>

            <h2 className="text-xl font-semibold">2. Cookies & Analytics</h2>
            <p>
              readzio may use minimal cookies or analytics tools to understand
              usage patterns, improve performance, and enhance user experience.
              These tools do not intentionally track personally identifiable
              information beyond what is required for functionality.
            </p>

            <h2 className="text-xl font-semibold">3. User-Generated Content</h2>
            <p>
              Content published on readzio — including articles, comments, and
              poll responses — is created by users. Users are responsible for
              the content they post. readzio does not claim ownership over user
              content but reserves the right to moderate or remove content that
              violates platform guidelines or applicable laws.
            </p>

            <h2 className="text-xl font-semibold">
              4. Embedded Content & External Links
            </h2>
            <p>
              Some content on readzio may include embedded media or links to
              third-party websites. These external sites may collect data or use
              cookies according to their own privacy policies. readzio has no
              control over external websites.
            </p>

            <h2 className="text-xl font-semibold">5. Your Rights</h2>
            <p>
              If you have an account or have submitted information and wish to
              access, update, or delete your data, you may contact us. We will
              take reasonable steps to honor such requests in accordance with
              applicable laws.
            </p>

            <h2 className="text-xl font-semibold">6. Policy Updates</h2>
            <p>
              This Privacy Policy may be updated from time to time to reflect
              changes in features, technology, or legal requirements. Continued
              use of readzio after updates implies acceptance of the revised
              policy.
            </p>

            <h2 className="text-xl font-semibold">7. Contact</h2>
            <p className="text-lg">
              For privacy-related questions, contact us at{" "}
              <a
                href="mailto:readzio.official@gmail.com"
                className="text-blue-600 underline"
              >
                readzio.official@gmail.com
              </a>
              .
            </p>

            <p className="text-lg">
              For more details, please review our{" "}
              <Link to="/terms-conditions" className="text-blue-600 underline">
                Terms & Conditions
              </Link>
              .
            </p>
          </div>

          <div className="mt-10 text-lg text-gray-500 text-center dark:text-gray-400">
            © {new Date().getFullYear()} readzio. All rights reserved.
          </div>
        </div>
      </div>
    </SpaceBackground>
  );
};

export default PrivacyPage;
