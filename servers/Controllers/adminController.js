// Controllers/adminController.js
import UserModel from "../Models/User.js";
import PostModel from "../Models/Post.js";
import { AppError } from "../utils/AppError.js";

// Get all users
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await UserModel.find().select("-password");
    res.status(200).json({ success: true, users });
  } catch (error) {
    next(new AppError(error.message, 500, "Admin GetAllUsers"));
  }
};

// Block or unblock user
export const toggleBlockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError("User not found", 404, "ToggleBlockUser");

    user.blocked = !user.blocked;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.blocked ? "blocked" : "unblocked"} successfully`,
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "ToggleBlockUser"));
  }
};

// Promote user to admin or demote to user
export const toggleUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError("User not found", 404, "ToggleUserRole");

    user.role = user.role === "admin" ? "user" : "admin";
    await user.save();

    res.status(200).json({
      success: true,
      message: `User role changed to ${user.role}`,
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "ToggleUserRole"));
  }
};

// Delete user
export const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const deletedUser = await UserModel.findByIdAndDelete(userId);
    if (!deletedUser) throw new AppError("User not found", 404, "DeleteUser");

    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "DeleteUser"));
  }
};

// Get all posts
export const getAllPosts = async (req, res, next) => {
  try {
    const posts = await PostModel.find().populate("author", "name email");
    res.status(200).json({ success: true, posts });
  } catch (error) {
    next(new AppError(error.message, 500, "Admin GetAllPosts"));
  }
};

// Block or unblock post
export const toggleBlockPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const post = await PostModel.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "ToggleBlockPost");

    post.blocked = !post.blocked;
    await post.save();

    res.status(200).json({
      success: true,
      message: `Post ${post.blocked ? "blocked" : "unblocked"} successfully`,
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "ToggleBlockPost"));
  }
};

// Delete post
export const deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const deletedPost = await PostModel.findByIdAndDelete(postId);
    if (!deletedPost) throw new AppError("Post not found", 404, "DeletePost");

    res.status(200).json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "DeletePost"));
  }
};
