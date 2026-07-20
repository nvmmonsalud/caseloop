"use client";

import { useEffect } from "react";

export default function FacultyError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Faculty analytics failed to load", error);
  }, [error]);

  return (
    <main className="shell grid min-h-[70vh] place-items-center py-16">
      <section role="alert" className="paper max-w-xl rounded-2xl p-8 text-center">
        <div className="eyebrow">Faculty analytics unavailable</div>
        <h1 className="serif mt-4 text-3xl">The cohort aggregate could not be loaded.</h1>
        <p className="mt-3 text-sm leading-6 text-[#68727b]">
          Private student work remains protected. Try loading the faculty-only aggregate again.
        </p>
        <button type="button" onClick={() => unstable_retry()} className="btn-primary mt-6">Try again</button>
      </section>
    </main>
  );
}
