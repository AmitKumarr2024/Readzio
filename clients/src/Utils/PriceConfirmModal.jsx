import React from "react";
import { Dialog } from "@headlessui/react";

const PriceConfirmModal = ({ isOpen, onClose, onConfirm, price }) => {
  const razorpayFee = price * 0.02; // 2% Razorpay transaction fee
  const platformFee = price * 0.20; // 20% platform fee
  const totalDeductions = razorpayFee + platformFee;
  const netAmount = price - totalDeductions;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-sm">
          <Dialog.Title className="text-lg font-semibold">Confirm Pricing</Dialog.Title>
          <div className="mt-2 text-sm text-gray-700">
            <p>
              Plan Price: <strong>₹{price.toFixed(2)}</strong>
            </p>
            <p>
              Razorpay Fee (2%): <strong>₹{razorpayFee.toFixed(2)}</strong>
            </p>
            <p>
              Platform Fee (20%): <strong>₹{platformFee.toFixed(2)}</strong>
            </p>
            <p>
              Net Amount: <strong>₹{netAmount.toFixed(2)}</strong>
            </p>
            <p className="mt-2">
              Are you sure you want to create this plan for <strong>₹{price.toFixed(2)}</strong>?
            </p>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:underline">
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Confirm
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default PriceConfirmModal;