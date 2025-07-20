import React from "react";
import { Dialog } from "@headlessui/react";
import { formatINRFromRupees } from "../../src/Utils/priceUtils";

// Confirms pricing with fees
const PriceConfirmModal = ({ isOpen, onClose, onConfirm, price }) => {
  const numericPrice = Number(price) || 0;
  const razorpayFee = numericPrice * 0.02;
  const platformFee = numericPrice * 0.2;
  const totalDeductions = razorpayFee + platformFee;
  const netAmount = numericPrice - totalDeductions;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-background-light dark:bg-background-dark rounded-lg p-6 w-full max-w-sm">
          <Dialog.Title className="text-lg font-semibold text-text-main-light dark:text-text-main-dark">
            Confirm Pricing
          </Dialog.Title>
          <div className="mt-2 text-sm text-text-main-light dark:text-text-main-dark">
            <p>
              Plan Price: <strong>{formatINRFromRupees(numericPrice)}</strong>
            </p>
            <p>
              Razorpay Fee (2%):{" "}
              <strong>{formatINRFromRupees(razorpayFee)}</strong>
            </p>
            <p>
              Platform Fee (20%):{" "}
              <strong>{formatINRFromRupees(platformFee)}</strong>
            </p>
            <p>
              Net Amount: <strong>{formatINRFromRupees(netAmount)}</strong>
            </p>
            <p className="mt-2">
              Are you sure you want to create this plan for{" "}
              <strong>{formatINRFromRupees(numericPrice)}</strong>?
            </p>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-text-main-light dark:text-text-main-dark hover:underline"
            >
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