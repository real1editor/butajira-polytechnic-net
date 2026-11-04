"use client";

import { ThemeProvider } from "@/app/contexts/ThemeContext";
import { AuthProvider } from "@/app/contexts/AuthContext";
import { ToastProvider } from "@/app/contexts/ToastContext";
import Toaster from "@/app/components/Toast";
import CommandPalette from "@/app/components/CommandPalette";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          {children}
          <Toaster />
          <CommandPalette />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}