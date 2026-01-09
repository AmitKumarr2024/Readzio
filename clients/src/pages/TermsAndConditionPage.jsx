import React from "react";
import SpaceBackground from "../Utils/SpaceBackground";

const TermsAndConditionPage = () => {
  return (
    <SpaceBackground>
      <div className="min-h-screen bg-background-light dark:bg-background-dark/0 py-12 px-6 md:px-20 lg:px-40">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-8 rounded-2xl shadow-xl">
          <h1 className="text-4xl font-bold mb-6">Terms & Conditions</h1>

          <p className="mb-4">
            Welcome to <strong>readzio</strong>. By accessing or using our
            website, services, and platform, you agree to comply with and be
            bound by the following Terms & Conditions. Please read them
            carefully.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">
            1. Using Our Service
          </h2>
          <p className="mb-4">
            You agree to use readzio in a respectful, lawful, and constructive
            manner. Any activity that disrupts the platform, harms other users,
            or violates applicable laws is strictly prohibited.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">2. Your Content</h2>
          <p className="mb-4">
            You are solely responsible for the content you publish on readzio,
            including articles, comments, and interactions. You retain ownership
            of your content; however, by posting it, you grant readzio a
            non-exclusive, worldwide, royalty-free license to host, display,
            distribute, and promote your content within the platform.
          </p>
          <p className="mb-4">
            readzio reserves the right to moderate, edit, or remove any content
            that violates these Terms, community standards, or applicable laws.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">
            3. Content Restrictions
          </h2>
          <p className="mb-4">
            To maintain a safe, respectful, and inclusive environment, the
            following content is strictly prohibited:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>
              Pornographic, sexually explicit, or sexually suggestive content.
            </li>
            <li>Gradual, implied, or disguised nudity.</li>
            <li>Sexualized depictions of public figures or celebrities.</li>
            <li>Links to adult or pornographic websites.</li>
            <li>
              Hate speech, harassment, threats, or discriminatory content.
            </li>
            <li>
              Illegal content, including promotion of drugs, violence, fraud, or
              other unlawful activities.
            </li>
          </ul>
          <p className="mb-4">
            Mature or sensitive topics (such as politics, mental health, or
            personal trauma) are permitted for educational, informational, or
            artistic purposes, provided they are shared responsibly and with
            appropriate context.
          </p>
          <p className="mb-4">
            Repeated or severe violations may result in content removal,
            temporary restrictions, or permanent account suspension.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">
            4. Free Access & Platform Availability
          </h2>
          <p className="mb-4">
            readzio is currently provided as a free-to-use platform. Access to
            core features does not require payment. We may introduce optional
            tools, features, or services in the future, which will be clearly
            communicated if applicable.
          </p>
          <p className="mb-4">
            To support platform operations and keep services accessible, readzio
            may display advertisements or sponsored content in certain areas of
            the platform.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">
            5. Limitation of Liability
          </h2>
          <p className="mb-4">
            While we strive to keep readzio reliable and secure, the platform is
            provided on an “as is” basis. readzio is not liable for service
            interruptions, data loss, or damages resulting from technical
            issues, third-party services, or user-generated content.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">6. Privacy</h2>
          <p className="mb-4">
            Your privacy is important to us. Please review our{" "}
            <a href="/privacy" className="text-blue-600 underline">
              Privacy Policy
            </a>{" "}
            to understand how information is collected and used.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">7. Governing Law</h2>
          <p className="mb-4">
            These Terms & Conditions are governed by and interpreted in
            accordance with the laws of India. Any disputes shall be subject to
            the exclusive jurisdiction of the courts of India.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">
            8. Updates to These Terms
          </h2>
          <p className="mb-4">
            We may update these Terms & Conditions from time to time to reflect
            changes in features, policies, or legal requirements. Continued use
            of readzio after updates indicates acceptance of the revised terms.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">9. Contact Us</h2>
          <p className="mb-4">
            If you have any questions regarding these Terms & Conditions, you
            may contact us at{" "}
            <a
              href="mailto:readzio.official@gmail.com"
              className="text-blue-600 underline"
            >
              readzio.official@gmail.com
            </a>
            .
          </p>

          <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} readzio. All rights reserved.
          </p>
        </div>
      </div>
    </SpaceBackground>
  );
};

export default TermsAndConditionPage;
