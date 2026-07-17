"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { useState } from "react";

type LoadingLinkProps = ComponentProps<typeof Link> & {
  children: ReactNode;
  loadingText?: ReactNode;
};

export default function LoadingLink({
  children,
  loadingText,
  className,
  onClick,
  ...props
}: LoadingLinkProps) {
  const [loading, setLoading] = useState(false);

  return (
    <Link
      {...props}
      aria-busy={loading}
      className={className}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        setLoading(true);
      }}
    >
      <span className="inline-flex items-center justify-center gap-1.5">
        {loading && (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" />
        )}
        <span>{loading ? (loadingText ?? children) : children}</span>
      </span>
    </Link>
  );
}
