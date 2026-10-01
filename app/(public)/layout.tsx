import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { VisitorTracker } from "@/components/analytics/visitor-tracker";

/**
 * Public shell: navigation, footer and the anonymous page-view tracker.
 *
 * The tracker is mounted here rather than in the root layout so the admin area
 * never records its own browsing as visitor traffic.
 */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#main"
        className="sr-only rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <VisitorTracker />
    </>
  );
}