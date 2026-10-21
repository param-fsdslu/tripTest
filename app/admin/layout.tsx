import { createClient } from "@/lib/db/server";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { QueryProvider } from "@/lib/providers/query-provider";
import type { Metadata } from "next";
import { getAdminRole, getRoleDisplayName } from "@/lib/utils/roles";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: {
    default: "Admin Dashboard — Triplovia",
    template: "%s | Triplovia Admin",
  },
  description: "Admin panel for Triplovia hotel booking platform",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  // Check if user is logged in
  if (!user) {
    redirect("/auth/login?redirect=/admin");
  }

  // Check if user has admin role (super_admin or hotel_admin)
  const adminRole = getAdminRole(user);
  if (!adminRole) {
    redirect("/dashboard");
  }

  const roleDisplayName = getRoleDisplayName(adminRole);
  const hotelIds = user.user_metadata?.hotel_ids || null;

  return (
    <html lang="en" className={fontVariables}>
      <body className="antialiased">
        <QueryProvider>
          <div className="flex h-screen overflow-hidden bg-background">
            {/* Sidebar */}
            <AdminNav
              email={user.email}
              role={adminRole}
              roleDisplayName={roleDisplayName}
              hotelIds={hotelIds}
            />

            {/* Main Content */}
            <div className="flex-1 overflow-auto lg:ml-0">
              <main className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-6">
                {children}
              </main>
            </div>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
