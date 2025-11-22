import React from "react";
import PropTypes from "prop-types";

/**
 * HeadingOutput Component - Production Ready
 * For server-rendered content with minimal styling
 * Lightweight version optimized for performance
 *
 * @param {number} level - Heading level (1-6)
 * @param {string} text - Heading text (rendered as plain text, HTML escaped)
 * @param {string} id - Optional ID for anchor links
 * @param {string} className - Additional CSS classes
 */
const HeadingOutput = ({
  level = 2,
  text = "",
  id,
  className = "",
  ...rest
}) => {
  // Validate and clamp level between 1-6
  const validLevel = Math.max(1, Math.min(6, parseInt(level) || 2));
  const Tag = `h${validLevel}`;

  // Auto-generate ID from text if not provided (for anchor links)
  const headingId =
    id ||
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  // Font size mapping for each level
  const fontSizeMap = {
    1: "text-4xl",
    2: "text-3xl",
    3: "text-2xl",
    4: "text-xl",
    5: "text-lg",
    6: "text-base",
  };

  return (
    <Tag
      id={headingId}
      className={`font-bold text-text-main-light dark:text-text-main-dark my-6 break-words ${fontSizeMap[validLevel]} ${className}`.trim()}
      {...rest}
    >
      {text}
    </Tag>
  );
};

// PropTypes for type checking
HeadingOutput.propTypes = {
  level: PropTypes.oneOf([1, 2, 3, 4, 5, 6]),
  text: PropTypes.string.isRequired,
  id: PropTypes.string,
  className: PropTypes.string,
};

export default HeadingOutput;
