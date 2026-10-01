"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { attachHistoryStorageListener } from "@/lib/history";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    attachHistoryStorageListener();
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster position="top-center" closeButton />
    </ThemeProvider>
  );
}
