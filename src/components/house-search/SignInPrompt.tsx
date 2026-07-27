"use client";

import { useState } from "react";
import { SignInModal } from "@/components/auth/SignInModal";

export function SignInPrompt() {
  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">My House Search</h1>
        <p className="text-sm text-gray-600">
          Track homes you have visited or plan to visit. Save notes, compare
          options, and see them on a map — all in one place.
        </p>
        <button
          type="button"
          onClick={() => setSignInOpen(true)}
          className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
        >
          Sign in to get started
        </button>
      </div>

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </div>
  );
}
