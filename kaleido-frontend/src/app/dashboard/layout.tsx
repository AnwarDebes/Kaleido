"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { initialize, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("kaleido_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    initialize()
      .then(() => {
        const state = useAuthStore.getState();
        if (!state.isAuthenticated) {
          router.replace("/login");
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [initialize, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500/30 border-t-amber-500" />
          <p className="text-sm text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-3 py-4 sm:p-6 pt-14 lg:pt-4">{children}</main>
      </div>
    </div>
  );
}
