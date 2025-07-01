import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import {
  refundSubscription,
  fetchSubscriptionHistoryByAuthor,
} from "../../../../store/subscriptionSlice";
import { toast } from "react-hot-toast";
import ModalBox from "../../../../Utils/ModalBox";
import { motion } from "framer-motion";
import { FaMoneyBillWave, FaSpinner } from "react-icons/fa";

const fetchedUserIdsGlobal = new Set();

const selectSubscription = createSelector(
  [(state) => state.subscription],
  (subscription) => ({
    subscriptionHistory: subscription.subscriptionHistory,
    loading: subscription.loading,
    error: subscription.error,
  })
);

const RefundSubscriptions = ({ userId }) => {
  const dispatch = useDispatch();
  const { subscriptionHistory, loading, error } =
    useSelector(selectSubscription);
  const [refundModal, setRefundModal] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  const [bankDetails, setBankDetails] = useState("");

  useEffect(() => {
    if (!userId || fetchedUserIdsGlobal.has(userId)) return;
    dispatch(fetchSubscriptionHistoryByAuthor(userId))
      .unwrap()
      .then(() => fetchedUserIdsGlobal.add(userId))
      .catch((err) => {
        console.error("❌ Failed to fetch history:", err);
        toast.error("Failed to load subscription history.");
      });
  }, [dispatch, userId]);

  const isRefundEligible = (subscription) => {
    if (
      !subscription?.paymentId ||
      subscription?.status === "refunded" ||
      subscription?.paymentStatus === "refunded"
    ) {
      return false;
    }
    const createdAt = new Date(subscription.createdAt);
    const now = new Date();
    const timeDiff = (now - createdAt) / (1000 * 60 * 60); // in hours
    return timeDiff <= 1;
  };

  const handleRefund = async (subscriptionId) => {
    if (!refundReason.trim()) {
      toast.error("Please provide a refund reason.");
      return;
    }

    try {
      await dispatch(
        refundSubscription({
          subscriptionId,
          reason: refundReason,
          bankDetails: bankDetails || null,
        })
      ).unwrap();
      toast.success("✅ Refund processed successfully!");
      setRefundModal(null);
      setRefundReason("");
      setBankDetails("");
    } catch (err) {
      console.error("❌ Refund failed:", err);
      toast.error(`Refund failed: ${err?.message || "Unknown error"}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        Error: {error?.message || "Failed to load subscriptions"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold bg-background-light dark:bg-background-dark ">Plan purchase by User</h2>
      {subscriptionHistory.length === 0 ? (
        <p className=" text-text-main-light dark:text-text-main-dark">No subscriptions found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-background-light dark:bg-background-dark rounded-lg shadow-md">
            <thead>
              <tr className="bg-background-light dark:bg-background-dark text-left  text-text-main-light dark:text-text-main-dark">
                <th className="py-3 px-4 font-semibold">Subscriber</th>
                <th className="py-3 px-4 font-semibold">Plan</th>
                <th className="py-3 px-4 font-semibold">Amount</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {subscriptionHistory.map((sub) => (
                <tr key={sub._id} className="border-t hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {sub.userId?.name || sub.userId?.email || "Unknown"}
                  </td>
                  <td className="py-3 px-4">{sub.planId?.name || "Unknown"}</td>
                  <td className="py-3 px-4">
                    ₹
                    {(sub.amount ).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3 px-4">
                    {sub.paymentStatus === "refunded" ? (
                      <span className="text-yellow-500">Refunded</span>
                    ) : sub.paymentStatus === "paid" ? (
                      <span className="text-green-600">Paid</span>
                    ) : (
                      <span className="text-red-600">Not Paid</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {new Date(sub.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <ModalBox isOpen={!!refundModal} onClose={() => setRefundModal(null)}>
        <motion.div
          className="bg-white rounded-2xl p-6"
          initial={{ scale: 0.7 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <h3 className="text-xl font-bold mb-4">Process Refund</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Reason for Refund *
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              rows="4"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Please explain the refund reason"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Bank Details (Optional)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              rows="2"
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
              placeholder="Enter bank info if needed"
            />
          </div>
        </motion.div>
      </ModalBox>
    </div>
  );
};

export default RefundSubscriptions;
