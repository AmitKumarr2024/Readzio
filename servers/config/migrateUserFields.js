import mongoose from "mongoose";
import { MONGO_URI } from "./dotenv.js";
import UserModel from "../../servers/Models/User.js";

export async function migrateUserFields() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      family: 4,
    });
    console.log("Successfully Connected with MongoDb");

    // Update documents where followers is not an array
    const followersResult = await UserModel.updateMany(
      { followers: { $not: { $type: "array" } } },
      { $set: { followers: [] } }
    );
    console.log(`Updated ${followersResult.modifiedCount} users' followers field`);

    // Update documents where following is not an array
    const followingResult = await UserModel.updateMany(
      { following: { $not: { $type: "array" } } },
      { $set: { following: [] } }
    );
    console.log(`Updated ${followingResult.modifiedCount} users' following field`);

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

