"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

const PUBLIC_PATHS = ["/login", "/register"];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isInitialized } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isInitialized) return;
    if (isLoading) return;
    if (user) return;

    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    if (!isPublic) {
      router.push("/login");
    }
  }, [user, isLoading, isInitialized, pathname, router]);

  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  return <>{children}</>;
}
