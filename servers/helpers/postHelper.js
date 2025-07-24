export const calculateReadTime = (blocks = []) => {
  const wordsPerMinute = 200;
  const imageViewTime = 12; // 12 seconds per image

  let totalWords = 0;
  let imageCount = 0;

  console.log("[calculateReadTime] Blocks received:", blocks.length);

  for (const block of blocks) {
    if (block.blocked) {
      console.log(`➡️ Skipped blocked block:`, block.id || block.type);
      continue;
    }

    if (["text", "quote", "code"].includes(block.type)) {
      const content = block.text || block.value || block.code || "";
      const words = content.trim().split(/\s+/).length;
      totalWords += words;
      console.log(`📝 ${block.type} block: ${words} words`);
    }

    if (block.type === "list" && Array.isArray(block.items)) {
      const listWords = block.items.join(" ").split(/\s+/).length;
      totalWords += listWords;
      console.log(`📋 list block: ${listWords} words`);
    }

    if (block.type === "caption") {
      const captionWords = (block.caption || "").split(/\s+/).length;
      totalWords += captionWords;
      console.log(`🖼️ caption block: ${captionWords} words`);
    }

    if (block.type === "image" && block.src) {
      imageCount += 1;
      console.log(`🖼️ image block: 1 image counted`);
    }
  }

  const readingTimeSeconds =
    (totalWords / wordsPerMinute) * 60 + imageCount * imageViewTime;
  const minutes = Math.ceil(readingTimeSeconds / 60);

  const result = {
    readTime: minutes <= 1 ? "1 min read" : `${minutes} min read`,
    readingTime: minutes,
  };

  console.log("[calculateReadTime] Total words:", totalWords);
  console.log("[calculateReadTime] Total images:", imageCount);
  console.log("[calculateReadTime] Estimated read time:", result);

  return result;
};
