import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BarChart3Icon, LockIcon } from "lucide-react";

import { isAdminAuthenticated } from "@/lib/auth";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) redirect("/admin");

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BarChart3Icon className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium">InsightHub</p>
              <p className="text-xs text-muted-foreground">Admin dashboard</p>
            </div>
          </div>

          <div className="mt-6">
            <h1 className="font-heading text-lg font-semibold tracking-tight">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the admin password to view visitor analytics.
            </p>
          </div>

          <LoginForm />
        </div>

        <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <LockIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            Sessions are signed with an HMAC token and expire after 8 hours. All admin
            activity is rate limited.
          </span>
        </p>
      </div>
    </div>
  );
}