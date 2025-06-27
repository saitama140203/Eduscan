"use client"

import { useEffect, useState } from "react"
import { LoginForm } from "@/components/auth/LoginForm"
import Link from "next/link"

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Đăng nhập vào EduScan
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Hoặc{" "}
          <Link
            href="/auth/register"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            tạo tài khoản mới
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
