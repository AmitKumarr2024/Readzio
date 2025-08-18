import React from "react";
import SpaceBackground from "../Utils/SpaceBackground";

const TermsAndConditionPage = () => {
  return (
    <SpaceBackground>
      <div className="min-h-screen bg-background-light dark:bg-background-dark/0 py-12 px-6 md:px-20 lg:px-40">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-8 rounded-2xl shadow-xl">
          <h1 className="text-4xl font-bold mb-6">Terms & Conditions</h1>

          <p className="mb-4">
            Welcome to <strong>inkshaa</strong>. By using our website, services,
            and platform, you agree to the following terms and conditions.
            Please read them carefully.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">
            1. Using Our Service
          </h2>
          <p className="mb-4">
            You agree to use inkshaa in ways that are respectful, legal, and
            constructive. Activities that hinder others’ experiences or violate
            laws are strictly prohibited.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">2. Your Content</h2>
          <p className="mb-4">
            You are responsible for the content you post. While you retain
            ownership of your content, by posting it, you grant us a license to
            display and promote it within inkshaa. We may remove content that
            violates our community guidelines or legal obligations.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">
            3. Content Restrictions
          </h2>
          <p className="mb-4">
            To maintain a safe and inclusive environment, inkshaa prohibits:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>Pornographic, sexually explicit, or suggestive content.</li>
            <li>Gradual or disguised nudity, even if partially clothed.</li>
            <li>Sexualized depictions of public figures or celebrities.</li>
            <li>Links to adult or pornographic websites.</li>
            <li>
              Hate speech, harassment, threats, or discriminatory content.
            </li>
            <li>
              Illegal content such as drug promotion, incitement to violence, or
              fraud.
            </li>
          </ul>
          <p className="mb-4">
            Mature topics (e.g., politics, mental health, trauma) are allowed
            for informational or artistic purposes, but must include clear
            context or warnings when necessary.
          </p>
          <p className="mb-4">
            Repeated violations of these guidelines may result in content
            removal or permanent suspension of your account.
          </p>

          {/* ✅ NEW PAYMENT SECTION */}
          <h2 className="text-2xl font-semibold mt-6 mb-3">
            4. Payments, Subscriptions & Refunds
          </h2>
          <p className="mb-4">
            inkshaa uses <strong>Razorpay</strong> as our secure payment
            gateway. By making any purchase or subscription on our platform, you
            agree to Razorpay's terms and processing policies.
          </p>
          <p className="mb-4">
            Refunds are generally <strong>not provided</strong> for completed
            payments, including subscriptions, tips, or donations. However, if a
            refund is approved under special circumstances (such as duplicate
            transactions or failed services), the amount will be processed
            within <strong>9–15 business days</strong> back to your original
            payment method, as per Razorpay’s policies.
          </p>
          <p className="mb-4">
            If you experience any issues with payment or billing, you may reach
            out to us at{" "}
            <a
              href="mailto:inksha.official@gmail.com"
              className="text-blue-600 underline"
            >
              inksha.official@gmail.com
            </a>{" "}
            for support.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">5. Our Liability</h2>
          <p className="mb-4">
            While we aim to keep inkshaa accessible and secure, we are not
            responsible for service interruptions, data loss, or damages caused
            by third-party services or technical failures.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">6. Privacy</h2>
          <p className="mb-4">
            Please review our{" "}
            <a href="/privacy" className="text-blue-600 underline">
              Privacy Policy
            </a>{" "}
            to understand how we collect and use your data.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">7. Governing Law</h2>
          <p className="mb-4">
            These terms are governed by the laws of India. Any disputes shall be
            resolved in the jurisdiction of Indian courts.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">
            8. Updates to These Terms
          </h2>
          <p className="mb-4">
            We may update these Terms & Conditions periodically. Continued use
            of inkshaa after changes means you accept the revised terms.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">9. Contact Us</h2>
          <p className="mb-4">
            For questions or feedback about these terms, please contact us at{" "}
            <a
              href="mailto:inksha.official@gmail.com"
              className="text-blue-600 underline"
            >
              inksha.official@gmail.com
            </a>
            .
          </p>

          <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} inkshaa. All rights reserved.
          </p>
        </div>
      </div>
    </SpaceBackground>
  );
};

export default TermsAndConditionPage;
