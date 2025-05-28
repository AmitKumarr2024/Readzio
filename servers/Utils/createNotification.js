import NotificationModel from "../Models/Notification.js";

export const createNotification = async ({ user, targetUser, type, postId }) => {
  // Don't notify if user likes their own post
  if (user.toString() === targetUser.toString()) return;

  const newNotification = new NotificationModel({
    user: targetUser,
    sender: user,
    type,
    post: postId,
  });

  await newNotification.save();
};
