"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/stores/authStore";
import { UserRole } from "@/lib/types";

interface NavigationProps {
  user: {
    firstName: string;
    lastName: string;
    role: UserRole;
  } | null | undefined;
  showProfileLink?: boolean;
  showDashboardLink?: boolean;
}

export default function Navigation({ 
  user, 
  showProfileLink = true,
  showDashboardLink = false 
}: NavigationProps) {
  return (
    <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard"
              className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md hover:shadow-lg transition-shadow overflow-hidden"
            >
              <Image
                src="/download.png"
                alt="Online İmtahan Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </Link>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Online İmtahan
            </h1>
          </div>
          <div className="flex items-center space-x-6">
            {user ? (
              <div className="text-right">
                <p className="text-gray-900 font-semibold">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-gray-500 capitalize">
                  {user.role === UserRole.STUDENT ? "Şagird" : "Müəllim"}
                </p>
              </div>
            ) : null}
            {showDashboardLink && (
              <Link
                href="/dashboard"
                aria-label="İdarə panelinə keç"
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                İdarə paneli
              </Link>
            )}
            {showProfileLink && (
              <Link
                href="/profile"
                aria-label="Şəxsi məlumatlar səhifəsinə keç"
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Şəxsi məlumatlar
              </Link>
            )}
            <button
              onClick={() => {
                useAuthStore.getState().logout();
                // logout() already redirects to /login
              }}
              aria-label="Hesabdan çıxış et"
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Çıxış
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
