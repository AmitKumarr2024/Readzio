// import React, { useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { useDispatch, useSelector } from 'react-redux';
// import toast from 'react-hot-toast';
// // import { fetchSubscriptionPlan } from '../../../store/subscriptionPlanSlice';

// const SubscriptionPlanDisplay = () => {
//   const { authorId, postId } = useParams();
//   const navigate = useNavigate();
//   const dispatch = useDispatch();
//   const { plan, loading, error } = useSelector((state) => state.subscription||{});
//   const { user, isAuthenticated } = useSelector((state) => state.auth||{});

//   useEffect(() => {
//     if (authorId) {
//       dispatch(fetchSubscriptionPlan(authorId));
//     }
//   }, [dispatch, authorId]);

//   const handlePayNow = (planType, price, currency) => {
//     if (!isAuthenticated) {
//       toast.error('Please sign in to subscribe.');
//       navigate('/signin');
//       return;
//     }
//     navigate(`/payment/${postId}/${authorId}/${planType}/${price}/${currency}`);
//   };

//   if (loading) return <div className="p-6 text-center">Loading...</div>;
//   if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
//   if (!plan || !plan.paidPosts) {
//     return <div className="p-6 text-center text-gray-500">No subscription plans available.</div>;
//   }

//   const postPlan = plan.paidPosts.find((p) => p.postId === postId);

//   if (!postPlan) {
//     return <div className="p-6 text-center text-gray-500">No subscription plan found for this post.</div>;
//   }

//   const plans = [
//     {
//       type: 'monthly',
//       price: postPlan.monthlyPrice,
//       currency: postPlan.currency,
//       description: 'Access this post for 30 days',
//     },
//     {
//       type: 'yearly',
//       price: postPlan.yearlyPrice,
//       currency: postPlan.currency,
//       description: 'Access this post for 1 year',
//     },
//   ];

//   console.log("ppppp",plan);
  
//   return (
//     <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
//       <div className="max-w-4xl w-full">
//         <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
//           Subscribe to Access Premium Content
//         </h1>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           {plans.map((plan) => (
//             <div
//               key={plan.type}
//               className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center"
//             >
//               <h2 className="text-xl font-semibold text-gray-800 capitalize">
//                 {plan.type} Plan
//               </h2>
//               <p className="text-2xl font-bold text-indigo-600 mt-2">
//                 {plan.currency} {plan.price}
//               </p>
//               <p className="text-gray-600 mt-2">{plan.description}</p>
//               <button
//                 onClick={() => handlePayNow(plan.type, plan.price, plan.currency)}
//                 className="mt-4 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
//               >
//                 Pay Now
//               </button>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default SubscriptionPlanDisplay;