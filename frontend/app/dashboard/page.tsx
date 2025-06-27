"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/authContext";
import { PageLoading } from "@/components/ui/loading";

export default function DashboardRedirect() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (isLoading) {
      return; // Wait until authentication status is determined
    }

    if (user) {
      // Redirect user based on their role
      const { role } = user;
      if (role === "admin") {
        router.replace("/dashboard/admin");
      } else if (role === "manager") {
        router.replace("/dashboard/manager");
      } else if (role === "teacher") {
        router.replace("/dashboard/teacher");
      } else {
        // If role is not defined, redirect to unauthorized page
        router.replace("/dashboard/unauthorized");
      }
    } else {
      // If no user, redirect to login page
      router.replace("/auth/login");
    }
  }, [user, isLoading, router]);

  return <PageLoading text="Đang khởi tạo bảng điều khiển..." />;
} 