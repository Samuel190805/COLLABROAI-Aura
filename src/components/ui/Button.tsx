"use client";

import React, { forwardRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  href?: string;
  download?: boolean | string;
  target?: string;
  rel?: string;
  pill?: boolean;
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
      pill = true,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles = cn(
      "inline-flex items-center justify-center font-medium transition-colors duration-150 select-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none border text-xs tracking-tight",
      pill ? "rounded-full" : "rounded-sm"
    );

    const variants = {
      // Monolith Inversion: black on white (dark: white on black)
      primary: "bg-mono-ink text-mono-bg border-mono-ink hover:opacity-90 active:scale-[0.99]",
      secondary: "bg-transparent text-mono-ink border-mono-line hover:bg-mono-bgAlt active:scale-[0.99]",
      outline: "bg-transparent text-mono-ink border-mono-line hover:border-mono-ink active:scale-[0.99]",
      ghost: "bg-transparent text-mono-inkMuted hover:text-mono-ink border-transparent hover:bg-mono-bgAlt",
      destructive: "bg-transparent text-mono-ink border-mono-line hover:border-mono-ink",
    };

    const sizes = {
      sm: "h-8 px-3.5 gap-1.5 text-xs",
      md: "h-9 px-5 gap-2 text-xs",
      lg: "h-11 px-7 gap-2.5 text-sm",
      icon: "h-9 w-9 p-0",
    };

    const content = isLoading ? (
      <div className="flex items-center gap-2">
        <svg
          className="animate-spin h-3.5 w-3.5 text-current"
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
            strokeWidth="3"
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

    const classes = cn(baseStyles, variants[variant], sizes[size], className);

    if (href) {
      const isInternal = href.startsWith("/") && !download;
      if (isInternal) {
        return (
          <Link href={href} className={classes} target={target} rel={rel}>
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
          className={classes}
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
        className={classes}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
