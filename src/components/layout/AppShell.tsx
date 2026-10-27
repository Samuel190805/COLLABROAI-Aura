"use client";

import React from "react";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";
import { ActivityTray } from "./ActivityTray";
import { GlobalAudioProvider } from "@/components/audio/GlobalAudioPlayer";
import { ToastContainer } from "@/components/ui/Toast";
import { JobsProvider } from "@/lib/jobs-context";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <JobsProvider>
      <GlobalAudioProvider>
        <div className="min-h-screen flex flex-col bg-mono-bg text-mono-ink relative transition-colors duration-150">
          <TopNav />
          <main className="flex-1 w-full flex flex-col">
            {children}
          </main>
          <ActivityTray />
          <Footer />
          <ToastContainer />
        </div>
      </GlobalAudioProvider>
    </JobsProvider>
  );
};

export default AppShell;
