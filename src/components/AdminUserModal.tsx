"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminUserModal({
  closeHref,
  children,
}: {
  closeHref: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.replace(closeHref);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeHref, router]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-zinc-950/50 p-6 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) router.replace(closeHref);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-modal-title"
        className="relative max-h-[calc(100vh-48px)] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        {children}
      </div>
    </div>
  );
}
