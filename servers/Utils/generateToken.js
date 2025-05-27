import jwt from "jsonwebtoken";
import { JWT_SECRET, NODE_ENV } from "../config/dotenv.js";



export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: "7d",
  });
  // now to send in cookies

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true, // cookie cannot be accessed or modified by the browser
    sameSite: "strict", // cookie will only be sent in a first-party context
    secure: NODE_ENV !== "development", // cookie will only be sent in a secure context
  });
  return token;
};