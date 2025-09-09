import React, { useMemo } from "react";
import {
  AlertTriangle,
  Image,
  FileText,
  Database,
  HardDrive,
} from "lucide-react";

const PostLimitsProgress = ({ title = "", blocks = [] }) => {
  const limits = useMemo(() => {
    const MAX_PAYLOAD_SIZE = 40 * 1024 * 1024; // 40 MB
    const MAX_TEXT_BLOCK_SIZE = 100 * 1024; // 100KB
    const MAX_TABLE_BLOCK_SIZE = 200 * 1024; // 200KB
    const MAX_IMAGE_COUNT = 40; // 40 images
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB per image

    // Count images
    const imageBlocks = blocks.filter(
      (block) => block.type === "image" && block.src
    );
    const imageCount = imageBlocks.length;

    // Calculate text block sizes
    let totalTextSize = 0;
    let largestTextBlock = 0;
    let textBlocksOverLimit = 0;

    blocks
      .filter((block) => block.type === "text")
      .forEach((block) => {
        const size = new TextEncoder().encode(block.value || "").length;
        totalTextSize += size;
        if (size > largestTextBlock) largestTextBlock = size;
        if (size > MAX_TEXT_BLOCK_SIZE) textBlocksOverLimit++;
      });

    // Calculate table block sizes
    let totalTableSize = 0;
    let largestTableBlock = 0;
    let tableBlocksOverLimit = 0;

    blocks
      .filter((block) => block.type === "table")
      .forEach((block) => {
        const size = new TextEncoder().encode(
          JSON.stringify(block.data || [])
        ).length;
        totalTableSize += size;
        if (size > largestTableBlock) largestTableBlock = size;
        if (size > MAX_TABLE_BLOCK_SIZE) tableBlocksOverLimit++;
      });

    // Estimate total payload size
    const postData = {
      title,
      blocks,
      category: "sample",
      postType: "sample",
      tags: ["sample"],
      language: "en",
    };
    const totalPayloadSize = new TextEncoder().encode(
      JSON.stringify(postData)
    ).length;

    // Calculate image sizes
    let totalImageSize = 0;
    let largestImageSize = 0;
    let imagesOverLimit = 0;

    imageBlocks.forEach((block) => {
      if (block.src && block.src.startsWith("data:")) {
        const estimatedSize = block.src.length * 0.75;
        totalImageSize += estimatedSize;
        if (estimatedSize > largestImageSize) largestImageSize = estimatedSize;
        if (estimatedSize > MAX_IMAGE_SIZE) imagesOverLimit++;
      }
    });

    return {
      images: {
        count: imageCount,
        max: MAX_IMAGE_COUNT,
        percentage: (imageCount / MAX_IMAGE_COUNT) * 100,
        overLimit: imageCount > MAX_IMAGE_COUNT,
      },
      payload: {
        size: totalPayloadSize,
        max: MAX_PAYLOAD_SIZE,
        percentage: (totalPayloadSize / MAX_PAYLOAD_SIZE) * 100,
        overLimit: totalPayloadSize > MAX_PAYLOAD_SIZE,
      },
      textBlocks: {
        largestSize: largestTextBlock,
        maxSize: MAX_TEXT_BLOCK_SIZE,
        percentage: (largestTextBlock / MAX_TEXT_BLOCK_SIZE) * 100,
        overLimit: textBlocksOverLimit > 0,
        blocksOverLimit: textBlocksOverLimit,
      },
      tableBlocks: {
        largestSize: largestTableBlock,
        maxSize: MAX_TABLE_BLOCK_SIZE,
        percentage: (largestTableBlock / MAX_TABLE_BLOCK_SIZE) * 100,
        overLimit: tableBlocksOverLimit > 0,
        blocksOverLimit: tableBlocksOverLimit,
      },
    };
  }, [title, blocks]);

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
  };

  const getProgressColor = (percentage, overLimit) => {
    if (overLimit) return "bg-red-500";
    if (percentage >= 90) return "bg-red-400";
    if (percentage >= 75) return "bg-yellow-400";
    if (percentage >= 50) return "bg-blue-400";
    return "bg-green-400";
  };

  const hasAnyLimits =
    limits.images.count > 0 || limits.payload.size > 0 || blocks.length > 0;

  if (!hasAnyLimits) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
          Start adding content to see usage limits
        </div>
      </div>
    );
  }

  const sections = [
    {
      icon: Image,
      label: "Images",
      count: limits.images.count,
      max: limits.images.max,
      percentage: limits.images.percentage,
      overLimit: limits.images.overLimit,
      color: getProgressColor(
        limits.images.percentage,
        limits.images.overLimit
      ),
    },
    {
      icon: HardDrive,
      label: "Total",
      count: formatBytes(limits.payload.size),
      max: "40MB",
      percentage: limits.payload.percentage,
      overLimit: limits.payload.overLimit,
      color: getProgressColor(
        limits.payload.percentage,
        limits.payload.overLimit
      ),
    },
    {
      icon: FileText,
      label: "Text",
      count: formatBytes(limits.textBlocks.largestSize),
      max: "100KB",
      percentage: limits.textBlocks.percentage,
      overLimit: limits.textBlocks.overLimit,
      color: getProgressColor(
        limits.textBlocks.percentage,
        limits.textBlocks.overLimit
      ),
    },
    {
      icon: Database,
      label: "Table",
      count: formatBytes(limits.tableBlocks.largestSize),
      max: "200KB",
      percentage: limits.tableBlocks.percentage,
      overLimit: limits.tableBlocks.overLimit,
      color: getProgressColor(
        limits.tableBlocks.percentage,
        limits.tableBlocks.overLimit
      ),
    },
  ].filter(
    (section) =>
      section.label === "Images" ||
      section.label === "Total" ||
      (section.label === "Text" && limits.textBlocks.largestSize > 0) ||
      (section.label === "Table" && limits.tableBlocks.largestSize > 0)
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">
          Content Limits
        </h3>
      </div>

      {/* Horizontal Progress Container */}
      <div className="relative">
        {/* Main Progress Track */}
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex">
          {sections.map((section, index) => (
            <React.Fragment key={section.label}>
              {/* Section Fill */}
              <div
                className="relative flex-1 flex items-center justify-center"
                style={{
                  background: `linear-gradient(to right, ${section.color.replace(
                    "bg-",
                    ""
                  )} ${Math.min(
                    section.percentage,
                    100
                  )}%, transparent ${Math.min(section.percentage, 100)}%)`,
                }}
              >
                {/* Section Background Color */}
                <div className="absolute inset-0 bg-gray-100 dark:bg-gray-600 opacity-30" />

                {/* Progress Fill */}
                <div
                  className={`absolute left-0 top-0 h-full ${section.color} transition-all duration-300`}
                  style={{ width: `${Math.min(section.percentage, 100)}%` }}
                />

                {/* Icon and Count */}
                <div className="relative z-10 flex items-center gap-1">
                  <section.icon
                    className={`w-4 h-4 ${
                      section.overLimit
                        ? "text-white"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  />
                  <span
                    className={`text-xs font-bold ${
                      section.overLimit
                        ? "text-white"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {typeof section.count === "number"
                      ? section.count
                      : section.count}
                  </span>
                  {section.overLimit && (
                    <AlertTriangle className="w-3 h-3 text-white ml-1" />
                  )}
                </div>
              </div>

              {/* Vertical Divider */}
              {index < sections.length - 1 && (
                <div className="w-px bg-gray-300 dark:bg-gray-600" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Labels Below */}
        <div className="flex mt-2">
          {sections.map((section, index) => (
            <React.Fragment key={`${section.label}-label`}>
              <div className="flex-1 text-center">
                <div
                  className={`text-xs font-medium ${
                    section.overLimit
                      ? "text-red-600 dark:text-red-400"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {section.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {typeof section.max === "number"
                    ? `/${section.max}`
                    : `/${section.max}`}
                </div>
                {section.percentage >= 90 && !section.overLimit && (
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">
                    Near limit
                  </div>
                )}
              </div>
              {index < sections.length - 1 && (
                <div className="w-px" /> // Spacer for alignment
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Overall Status */}
      {(limits.images.overLimit ||
        limits.payload.overLimit ||
        limits.textBlocks.overLimit ||
        limits.tableBlocks.overLimit) && (
        <div className="mt-4 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              Some limits exceeded - please reduce content
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostLimitsProgress;
