import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createOrder,
  verifyPayment,
  resetPaymentState,
} from "../../store/paymentSlice";
import { subscribeToPlan } from "../../store/subscriptionSlice";
import { FaStar } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";

const PlanCard = ({
  plan,
  isSubscribed,
  subscriptionId: propSubscriptionId,
  onSubscribe,
}) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [localSubscriptionId, setLocalSubscriptionId] = useState(propSubscriptionId);
  const TEST_MODE = true;
  const generateSafeReceipt = (planId) =>
    `rcpt_${planId.slice(0, 8)}_${Date.now().toString().slice(-6)}`.slice(0, 40);

  useEffect(() => {
    console.debug(`[PlanCard] Initial props for plan ${plan._id}:`, {
      isSubscribed,
      propSubscriptionId,
      localSubscriptionId,
    });

    if (window.Razorpay) {
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      console.debug("[PlanCard] Razorpay SDK loaded successfully");
      setSdkLoaded(true);
    };
    script.onerror = () => {
      console.error("[PlanCard] Failed to load Razorpay SDK");
      toast.error("Failed to load payment gateway. Please try again later.");
      setSdkLoaded(false);
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [plan._id]);

  useEffect(() => {
    console.debug(`[PlanCard] Updating subscription state for plan ${plan._id}:`, {
      isSubscribed,
      propSubscriptionId,
      localSubscriptionId,
    });
    if (propSubscriptionId) {
      console.debug(`[PlanCard] Setting localSubscriptionId from propSubscriptionId:`, propSubscriptionId);
      setLocalSubscriptionId(propSubscriptionId);
    }
  }, [isSubscribed, propSubscriptionId, localSubscriptionId, plan._id]);

  const handlePayment = async () => {
    if (!sdkLoaded) {
      toast.error("Payment gateway not loaded. Please try again.");
      return;
    }
    if (!plan?._id || !plan?.price || isNaN(plan.price) || plan.price <= 0) {
      toast.error("Invalid plan details. Please contact support.");
      return;
    }
    if (!user?.email) {
      toast.error("User email not found. Please log in again.");
      return;
    }
    if (!import.meta.env.VITE_RAZORPAY_KEY_ID) {
      toast.error("Payment configuration error. Please contact support.");
      return;
    }

    setLoading(true);
    setConfirmationMessage("");

    try {
      const orderResult = await dispatch(
        createOrder({
          amount: plan.price,
          currency: "INR",
          receipt: generateSafeReceipt(plan._id),
        })
      ).unwrap();

      if (!orderResult?.id) {
        throw new Error("Invalid order response from server");
      }

      console.debug(`[PlanCard] Order created for plan ${plan._id}:`, orderResult);

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderResult.amount,
        currency: orderResult.currency,
        order_id: orderResult.id,
        description: `Subscription for ${plan.name}`,
        handler: async (response) => {
          try {
            const verificationResult = await dispatch(
              verifyPayment({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              })
            ).unwrap();

            if (!verificationResult.success) {
              throw new Error("Payment verification failed");
            }

            const subscribePayload = {
              planId: plan._id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            };

            const subscriptionResult = await dispatch(
              subscribeToPlan(subscribePayload)
            ).unwrap();

            console.debug(`[PlanCard] Subscription result for plan ${plan._id}:`, subscriptionResult);

            if (!subscriptionResult?.subscription?._id) {
              throw new Error("Subscription creation failed: No subscription ID returned");
            }

            const newSubscriptionId = subscriptionResult.subscription._id;
            setLocalSubscriptionId(newSubscriptionId);
            console.debug(`[PlanCard] Set subscription state after payment for plan ${plan._id}:`, {
              localSubscriptionId: newSubscriptionId,
            });

            setConfirmationMessage(`✅ Payment successful! Payment ID: ${response.razorpay_payment_id}`);
            if (onSubscribe) {
              console.debug(`[PlanCard] Triggering onSubscribe for plan ${plan._id}:`, newSubscriptionId);
              await onSubscribe(newSubscriptionId);
            }
          } catch (error) {
            console.error(`[PlanCard] Subscription failed for plan ${plan._id}:`, error);
            setConfirmationMessage(`❌ Payment failed: ${error.message || "Unknown error"}`);
            toast.error(`Payment failed: ${error.message || "Unknown error"}`);
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          email: user.email,
          contact: user?.phone || "",
        },
        theme: {
          color: "#4B0082",
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setConfirmationMessage("❌ Payment cancelled by user");
            toast.error("Payment cancelled");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        console.error("[PlanCard] Payment failed:", response.error);
        setConfirmationMessage(`❌ Payment failed: ${response.error.description}`);
        toast.error(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });
      rzp.open();
    } catch (error) {
      console.error(`[PlanCard] Order creation failed for plan ${plan._id}:`, error);
      setConfirmationMessage(`❌ Order creation failed: ${error.message || "Unknown error"}`);
      toast.error(`Order creation failed: ${error.message || "Unknown error"}`);
      setLoading(false);
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-gray-900 to-black text-white shadow-2xl rounded-2xl p-6 m-4 w-full max-w-sm transform hover:-translate-y-2 transition-all duration-300 border border-indigo-500/30">
      <div className="absolute inset-0 z-0 opacity-20">
        {[...Array(5)].map((_, i) => (
          <FaStar
            key={i}
            className="absolute text-indigo-300 animate-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              fontSize: `${Math.random() * 12 + 6}px`,
              animationDuration: `${Math.random() * 3 + 2}s`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-2xl">
        {plan.popular ? "Most Popular" : "Best Value"}
      </div>

      <h2 className="relative z-10 text-2xl font-extrabold mb-2">{plan.name}</h2>
      <div className="relative z-10 flex items-baseline mb-2">
        <span className="text-4xl font-bold">₹{(plan.price / 100).toFixed(0)}</span>
        <span className="text-gray-400 text-sm ml-2">/{plan.durationDays} days</span>
      </div>
      <p className="relative z-10 text-gray-400 text-sm mb-4">
        {plan.description || "Unlock exclusive content and premium features with this plan."}
      </p>
      <div className="relative z-10 mb-4">
        <p className="text-gray-300 text-sm">
          <span className="font-semibold">Posts:</span> {plan.postCount || "Unlimited"} posts
        </p>
        <p className="text-gray-300 text-sm">
          <span className="font-semibold">Access:</span> {plan.accessLevel || "Full"} content access
        </p>
      </div>
      <ul className="relative z-10 space-y-2 mb-6">
        {plan.features?.map((feature, index) => (
          <li key={index} className="flex items-center text-gray-300">
            <svg
              className="w-5 h-5 text-indigo-400 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      {confirmationMessage && (
        <div
          className={`relative z-10 mb-4 p-3 rounded-lg text-sm ${
            confirmationMessage.startsWith("✅") ? "bg-green-500/20 text-green-300" : "bg-red-600/20 text-red-300"
          }`}
        >
          {confirmationMessage}
        </div>
      )}
      {isSubscribed ? (
        <button
          disabled
          className="relative z-10 w-full py-3 rounded-xl bg-green-600/50 text-white font-semibold cursor-not-allowed shadow-md border border-gray-700"
        >
          Subscribed
        </button>
      ) : (
        <motion.button
          onClick={handlePayment}
          disabled={loading || !sdkLoaded}
          className={`relative z-10 w-full py-3 rounded-xl text-white font-semibold shadow-md transition-all duration-300 ${
            loading || !sdkLoaded
              ? "bg-indigo-400/50 cursor-wait"
              : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 border border-indigo-600"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {loading ? "Processing..." : "Subscribe Now"}
        </motion.button>
      )}

      <style>
        {`
          @keyframes twinkle {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 0.2; }
          }
          .animate-twinkle {
            animation: twinkle linear infinite;
          }
        `}
      </style>
    </div>
  );
};

export default PlanCard;