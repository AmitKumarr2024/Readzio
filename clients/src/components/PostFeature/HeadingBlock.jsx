import React from "react";
import PropTypes from "prop-types";

/**
 * HeadingBlock Component - Production Ready
 * For client-side rich editor with full interactivity
 *
 * @param {number} level - Heading level (1-6)
 * @param {string} text - Heading text (rendered as plain text, HTML escaped)
 * @param {string} id - Optional ID for anchor links
 * @param {string} className - Additional CSS classes
 * @param {boolean} showBorder - Show bottom border (default: true for h1-h3)
 * @param {function} onClick - Optional click handler
 * @param {string} ariaLabel - Optional aria-label for accessibility
 */
const HeadingBlock = ({
  level = 2,
  text = "",
  id,
  className = "",
  showBorder,
  onClick,
  ariaLabel,
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

  // Determine if border should show
  const shouldShowBorder =
    showBorder !== undefined ? showBorder : validLevel <= 3;

  // Base styles - common for all headings
  const baseStyles =
    "w-full text-text-main-light dark:text-text-main-dark font-extrabold tracking-wide break-words hyphens-auto";

  // Level-specific styles
  const levelStyles = {
    1: `text-5xl md:text-6xl mb-6 ${
      shouldShowBorder
        ? "border-b-4 border-gray-800 dark:border-gray-300 pb-3"
        : ""
    }`,
    2: `text-4xl md:text-5xl mb-5 ${
      shouldShowBorder
        ? "border-b-2 border-gray-700 dark:border-gray-400 pb-2"
        : ""
    }`,
    3: `text-3xl md:text-4xl mb-4 ${
      shouldShowBorder
        ? "border-b border-gray-600 dark:border-gray-500 pb-1.5"
        : ""
    }`,
    4: "text-2xl md:text-3xl mb-3",
    5: "text-xl md:text-2xl mb-2",
    6: "text-lg md:text-xl mb-2",
  };

  // Interaction styles if clickable
  const interactionStyles = onClick
    ? "cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
    : "";

  return (
    <Tag
      id={headingId}
      className={`${baseStyles} ${levelStyles[validLevel]} ${interactionStyles} ${className}`.trim()}
      onClick={onClick}
      aria-label={ariaLabel}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      {...rest}
    >
      {text}
    </Tag>
  );
};

// PropTypes for type checking
HeadingBlock.propTypes = {
  level: PropTypes.oneOf([1, 2, 3, 4, 5, 6]),
  text: PropTypes.string.isRequired,
  id: PropTypes.string,
  className: PropTypes.string,
  showBorder: PropTypes.bool,
  onClick: PropTypes.func,
  ariaLabel: PropTypes.string,
};

export default HeadingBlock;
