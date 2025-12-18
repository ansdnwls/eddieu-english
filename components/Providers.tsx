"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import LetterNotificationPopup from "@/app/components/LetterNotificationPopup";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <LetterNotificationPopup />
    </AuthProvider>
  );
}





