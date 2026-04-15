"use client";

import { signOut } from "next-auth/react";

interface Props {
  user: { email: string; name?: string | null };
}

export function TopBar({ user }: Props) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-end gap-4">
      <span className="text-sm text-gray-500">{user.name ?? user.email}</span>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
      >
        Sign out
      </button>
    </header>
  );
}
