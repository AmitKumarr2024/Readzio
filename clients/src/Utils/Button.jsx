// A simple Button component using DaisyUI classes
import React from "react";

export function Button({ children, variant = "default", size = "md", className = "", ...props }) {
  const baseClass = "btn"; // DaisyUI base class for buttons

  // Variants can be extended here (e.g. primary, ghost)
  const variantClass = {
    default: "btn-primary",
    ghost: "btn-ghost",
    icon: "btn-square btn-ghost p-2",
  }[variant] || "btn-primary";

  // Sizes (sm, md, lg)
  const sizeClass = {
    sm: "btn-sm",
    md: "btn-md",
    lg: "btn-lg",
  }[size] || "btn-md";

  return (
    <button className={`${baseClass} ${variantClass} ${sizeClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
