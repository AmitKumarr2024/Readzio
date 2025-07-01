import SubscriptionModel from "../Models/UserSubscriptionModel.js"; // adjust path if needed

export const checkIfSubscribed = async (userId, authorId) => {
  if (!userId || !authorId) return false;

  const activeSubscription = await SubscriptionModel.findOne({
    user: userId,
    author: authorId,
    expiresAt: { $gt: new Date() }
  });

  return !!activeSubscription;
};