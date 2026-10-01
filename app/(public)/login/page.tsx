import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3Icon } from "lucide-react";

import { authenticatedRedirectPath } from "@/lib/auth-pages";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const target = await authenticatedRedirectPath();
  if (target) redirect(target);

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BarChart3Icon className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium">InsightHub</p>
              <p className="text-xs text-muted-foreground">Sign in to your account</p>
            </div>
          </div>

          <h1 className="mt-6 font-heading text-lg font-semibold tracking-tight">
            Welcome back
          </h1>

          <LoginForm />

          <p className="mt-5 text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}