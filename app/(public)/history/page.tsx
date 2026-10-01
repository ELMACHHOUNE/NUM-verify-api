import type { Metadata } from "next";

import { ValidationHistory } from "@/components/phone/validation-history";

export const metadata: Metadata = {
  title: "Validation History",
  description: "Previously validated phone numbers, stored locally in your browser.",
};

export default function HistoryPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <ValidationHistory />
    </div>
  );
}