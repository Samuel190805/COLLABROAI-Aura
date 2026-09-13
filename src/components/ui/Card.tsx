"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "interactive";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = "default",
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      default: "bg-mono-bg border-hairline",
      subtle: "bg-mono-bgAlt border-hairline",
      interactive: "bg-mono-bg border-hairline hover:border-mono-ink transition-colors cursor-pointer",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-sm p-6 text-mono-ink transition-colors duration-150",
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
export default Card;
