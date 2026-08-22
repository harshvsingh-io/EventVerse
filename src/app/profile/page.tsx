"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";

export default function ProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const user = db.getCurrentUser();
    if (user && user.username) {
      router.replace(`/profile/${user.username}`);
    } else {
      router.replace("/");
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#06060c] flex items-center justify-center">
      <div className="w-6 h-6 border-t-2 border-brand-primary rounded-full animate-spin"></div>
    </div>
  );
}
