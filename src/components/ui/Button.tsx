"use client";

import React, { forwardRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "glass" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  href?: string;
  download?: boolean | string;
  target?: string;
  rel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      href,
      download,
      target,
      rel,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:active:scale-100 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue/50 cursor-pointer";

    const variants = {
      primary:
        "bg-apple-blue text-white hover:bg-apple-blueHover shadow-sm hover:shadow-apple",
      secondary:
        "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700",
      glass:
        "backdrop-blur-xl bg-white/70 text-neutral-900 border border-neutral-200/80 hover:bg-white/90 dark:bg-neutral-900/60 dark:text-neutral-100 dark:border-white/10 dark:hover:bg-neutral-900/80 shadow-apple",
      outline:
        "border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800",
      ghost:
        "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
      destructive:
        "bg-red-500 text-white hover:bg-red-600 shadow-sm",
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5 h-8 gap-1.5",
      md: "text-sm px-5 py-2.5 h-10 gap-2",
      lg: "text-base px-7 py-3 h-12 gap-2.5 font-semibold",
      icon: "h-10 w-10 p-0 rounded-full",
    };

    const content = isLoading ? (
      <div className="flex items-center gap-2">
        <svg
          className="animate-spin h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span>{children}</span>
      </div>
    ) : (
      children
    );

    if (href) {
      const isInternal = href.startsWith("/") && !download;
      const combinedClasses = cn(baseStyles, variants[variant], sizes[size], className);

      if (isInternal) {
        return (
          <Link href={href} className={combinedClasses} target={target} rel={rel}>
            {content}
          </Link>
        );
      }

      return (
        <a
          href={href}
          download={download}
          target={target}
          rel={rel}
          className={combinedClasses}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
