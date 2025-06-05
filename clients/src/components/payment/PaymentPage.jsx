// import React, { useState, useEffect, memo } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { useDispatch, useSelector } from 'react-redux';
// // import { createOrder, fetchPayments, resetPaymentState, verifyPayment } from '../../store/paymentSlice';
// // import { setSubscriptionData, subscribeToPost } from '../../store/subscriptionPlanSlice';


// const PaymentPage = () => {
//   const { postId, authorId, planType, amount, currency } = useParams();
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const { order, paymentStatus, paymentId, error, payments, isModalOpen, verificationResult } = useSelector(
//     (state) => state.payment
//   );
//   const supportedCurrencies = ['INR', 'USD', 'EUR'];
//   const selectedCurrency = currency && supportedCurrencies.includes(currency) ? currency : 'INR';

//   const [formData, setFormData] = useState({
//     amount: amount || '',
//     receipt: `receipt_${Date.now()}`,
//     notes: { plan: planType || 'starter', postId, authorId },
//     error: null, // Added for client-side error display
//   });

//   // Load Razorpay script
//   useEffect(() => {
//     const script = document.createElement('script');
//     script.src = 'https://checkout.razorpay.com/v1/checkout.js';
//     script.async = true;
//     script.onload = () => console.log('Razorpay script loaded');
//     script.onerror = () => console.error('Failed to load Razorpay script');
//     document.body.appendChild(script);
//     return () => document.body.removeChild(script);
//   }, []);

//   // Fetch payments and set subscription data
//   useEffect(() => {
//     if (postId && authorId && planType) {
//       dispatch(setSubscriptionData({ postId, authorId, planType })).then(() => {
//         dispatch(fetchPayments({ page: 1, limit: 20 }));
//       });
//     }
//     return () => dispatch(resetPaymentState());
//   }, [dispatch, postId, authorId, planType]);

//   const handleAmountChange = (e) => {
//     const value = e.target.value;
//     if (value >= 0) {
//       setFormData({ ...formData, amount: value, error: null });
//     }
//   };

//   const handleCreateOrder = async (e) => {
//     e.preventDefault();
//     if (!formData.amount || formData.amount <= 0) {
//       setFormData({ ...formData, error: 'Please enter a valid amount' });
//       return;
//     }

//     const orderData = {
//       amount: parseFloat(formData.amount),
//       currency: selectedCurrency,
//       receipt: formData.receipt,
//       notes: formData.notes,
//     };

//     try {
//       const result = await dispatch(createOrder(orderData)).unwrap();
//       const razorpayKey = process.env.REACT_APP_RAZORPAY_KEY_ID || 'YOUR_RAZORPAY_KEY_ID';
//       const options = {
//         key: razorpayKey,
//         amount: result.order.amount,
//         currency: result.order.currency,
//         name: 'Your Company Name',
//         description: `Subscription for ${planType} plan`,
//         order_id: result.order.id,
//         handler: async function (response) {
//           try {
//             const paymentData = {
//               razorpay_order_id: response.razorpay_order_id,
//               razorpay_payment_id: response.razorpay_payment_id,
//               razorpay_signature: response.razorpay_signature,
//             };
//             const verifyResult = await dispatch(verifyPayment(paymentData)).unwrap();
//             if (verifyResult.success) {
//               const subscribeResult = await dispatch(
//                 subscribeToPost({
//                   authorId,
//                   postId,
//                   planType,
//                   paymentId: response.razorpay_payment_id,
//                 })
//               ).unwrap();
//               if (subscribeResult) {
//                 navigate(`/post/${postId}`);
//               } else {
//                 setFormData({ ...formData, error: 'Subscription failed. Please try again.' });
//               }
//             } else {
//               setFormData({ ...formData, error: verifyResult.message || 'Payment verification failed.' });
//             }
//           } catch (err) {
//             setFormData({ ...formData, error: 'An error occurred during payment processing.' });
//           }
//         },
//         prefill: {
//           name: 'Customer Name',
//           email: 'customer@example.com',
//           contact: '9999999999',
//         },
//         theme: { color: '#4f46e5' },
//       };
//       if (window.Razorpay) {
//         const rzp = new window.Razorpay(options);
//         rzp.open();
//       } else {
//         setFormData({ ...formData, error: 'Razorpay is not available. Please try again later.' });
//       }
//     } catch (err) {
//       setFormData({ ...formData, error: 'Failed to create order. Please try again.' });
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
//       <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
//         <h1 className="text-2xl font-bold text-gray-800 mb-6">Make a Payment</h1>
//         <form onSubmit={handleCreateOrder} className="space-y-4">
//           <div>
//             <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
//               Amount ({selectedCurrency})
//             </label>
//             <input
//               id="amount"
//               type="number"
//               value={formData.amount}
//               onChange={handleAmountChange}
//               min="0"
//               step="0.01"
//               className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
//               placeholder="Enter amount"
//               disabled={!!amount}
//               aria-required="true"
//               required
//             />
//           </div>
//           <div>
//             <label htmlFor="receipt" className="block text-sm font-medium text-gray-700">
//               Receipt ID
//             </label>
//             <input
//               id="receipt"
//               type="text"
//               value={formData.receipt}
//               onChange={(e) => setFormData({ ...formData, receipt: e.target.value, error: null })}
//               className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
//               placeholder="Enter receipt ID"
//               aria-required="true"
//               required
//             />
//           </div>
//           <div>
//             <label htmlFor="plan" className="block text-sm font-medium text-gray-700">
//               Plan
//             </label>
//             <input
//               id="plan"
//               type="text"
//               value={formData.notes.plan}
//               onChange={(e) =>
//                 setFormData({ ...formData, notes: { ...formData.notes, plan: e.target.value }, error: null })
//               }
//               className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
//               placeholder="Enter plan"
//               disabled={!!planType}
//               aria-required="true"
//             />
//           </div>
//           <button
//             type="submit"
//             disabled={paymentStatus === 'loading'}
//             className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-400"
//           >
//             {paymentStatus === 'loading' ? 'Processing...' : 'Pay Now'}
//           </button>
//           {(error || formData.error) && (
//             <p className="text-red-500 text-sm mt-2">{error || formData.error}</p>
//           )}
//         </form>

//         {paymentId && (
//           <div className="mt-4 p-4 bg-green-100 rounded-md">
//             <p className="text-green-800">Payment ID: {paymentId}</p>
//           </div>
//         )}

//         <div className="mt-6">
//           <h2 className="text-lg font-semibold text-gray-800">Payment History</h2>
//           {paymentStatus === 'loading' ? (
//             <div className="text-center mt-4">Loading payments...</div>
//           ) : (
//             <div className="mt-4 space-y-4">
//               {payments.map((payment) => (
//                 <div key={payment._id || Math.random()} className="p-4 bg-gray-50 rounded-md">
//                   <p><strong>Order ID:</strong> {payment.orderId || 'N/A'}</p>
//                   <p>
//                     <strong>Amount:</strong> {payment.currency || 'INR'} {payment.amount ? payment.amount / 100 : 'N/A'}
//                   </p>
//                   <p><strong>Status:</strong> {payment.status || 'Unknown'}</p>
//                   <p>
//                     <strong>Date:</strong> {payment.createdAt ? new Date(payment.createdAt).toLocaleString() : 'N/A'}
//                   </p>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {isModalOpen && verificationResult && (
//           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" role="dialog" aria-modal="true">
//             <div className="bg-white rounded-lg p-6 max-w-sm w-full">
//               <h2 className="text-xl font-bold text-gray-800 mb-4">
//                 {verificationResult.success ? 'Payment Successful' : 'Payment Failed'}
//               </h2>
//               <p className="text-gray-600 mb-4">{verificationResult.message}</p>
//               {verificationResult.success && paymentId && (
//                 <p className="text-gray-600 mb-4">Payment ID: {paymentId}</p>
//               )}
//               <div className="flex space-x-4">
//                 {!verificationResult.success && (
//                   <button
//                     onClick={() => dispatch(closeModal())}
//                     className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
//                   >
//                     Retry
//                   </button>
//                 )}
//                 <button
//                   onClick={() => {
//                     dispatch(closeModal());
//                     if (verificationResult.success) {
//                       navigate(`/post/${postId}`);
//                     }
//                   }}
//                   className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
//                 >
//                   Close
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default memo(PaymentPage);