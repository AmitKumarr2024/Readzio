import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Post from "../../servers/Models/Post.js";
import { MONGO_URI } from "../../servers/config/dotenv.js"; //
async function fixEmptyTableData() {
  try {
    if (!MONGO_URI) {
      console.error(
        "[fixEmptyTableData] Missing MONGO_URI environment variable"
      );
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("[fixEmptyTableData] Connected to MongoDB");

    const posts = await Post.find({ "blocks.type": "table" });
    console.log(
      "[fixEmptyTableData] Found posts with table blocks:",
      posts.length
    );

    let updatedCount = 0;
    for (const post of posts) {
      let updated = false;
      post.blocks = post.blocks.map((block) => {
        if (
          block.type === "table" &&
          (!block.data || block.data.length === 0)
        ) {
          console.log(
            `[fixEmptyTableData] Found empty table in post ${post._id}`
          );
          block.data = [["No data available"]];
          updated = true;
        }
        return block;
      });
      if (updated) {
        await post.save({ validateBeforeSave: true });
        updatedCount++;
        console.log(`[fixEmptyTableData] Updated post ${post._id}`);
      }
    }
    console.log(`[fixEmptyTableData] Completed, updated ${updatedCount} posts`);
  } catch (error) {
    console.error("[fixEmptyTableData] Error:", error.message, error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("[fixEmptyTableData] Disconnected from MongoDB");
  }
}

fixEmptyTableData();
