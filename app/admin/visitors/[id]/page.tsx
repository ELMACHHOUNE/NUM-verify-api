import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { getVisitorById, isValidObjectId } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { DatabaseError, isDatabaseConfigured } from "@/lib/mongodb";

import { VisitorDetailCard } from "./visitor-detail-card";

export const metadata: Metadata = {
  title: "Visitor detail",
  robots: { index: false, follow: false },
};

/**
 * Server-rendered single visitor view.
 *
 * Data is read directly through the analytics layer rather than the admin API so
 * the page renders in one round trip and stays a true server component.
 */
export default async function VisitorDetailPage({
  params,
}: PageProps<"/admin/visitors/[id]">) {
  const { id } = await params;

  if (!isValidObjectId(id)) notFound();

  if (!isDatabaseConfigured()) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          Analytics storage is not configured. Set <code>MONGODB_URI</code> to view visitor
          details.
        </p>
      </div>
    );
  }

  let visitor;
  try {
    visitor = await getVisitorById(id);
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.error(`[admin/visitors/${id}] ${error.code}: ${error.message}`);
      throw error;
    }
    throw error;
  }

  if (!visitor) notFound();

  return (
    <div className="space-y-5">
      <BackLink />
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">Visitor detail</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          All recorded signals for {visitor.ip}. Geolocation is approximate.
        </p>
      </div>
      <VisitorDetailCard visitor={visitor} />
    </div>
  );
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link href="/admin/visitors">
        <ArrowLeftIcon aria-hidden="true" />
        Back to visitors
      </Link>
    </Button>
  );
}