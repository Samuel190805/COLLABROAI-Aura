"use client";

import React from "react";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";
import { GlobalAudioProvider } from "@/components/audio/GlobalAudioPlayer";
import { ToastContainer } from "@/components/ui/Toast";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <GlobalAudioProvider>
      <div className="min-h-screen flex flex-col bg-mono-bg text-mono-ink relative transition-colors duration-150">
        <TopNav />
        <main className="flex-1 w-full flex flex-col">
          {children}
        </main>
        <Footer />
        <ToastContainer />
      </div>
    </GlobalAudioProvider>
  );
};

export default AppShell;
