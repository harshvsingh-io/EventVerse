"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide sidebar on landing, onboarding, and signup pages
  const hideSidebar =
    pathname === "/" ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/onboarding");

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#06060c] text-white">
      <Sidebar />
      <main className="flex-1 w-full md:h-screen md:overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
