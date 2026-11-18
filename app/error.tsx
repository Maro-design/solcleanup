"use client";

/** Route-level error boundary in the site's visual language. Nothing is signed or sent from here. */
import Link from "next/link";
import { useEffect } from "react";
import { buttonClass } from "@/components/ui/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="mx-auto flex min-h-[80svh] w-full max-w-[1200px] flex-col justify-center px-6 py-32">
      <p className="font-mono text-14 text-meta">Error{error.digest ? ` · ${error.digest}` : ""}</p>
      <h1 className="heading mt-4 max-w-[720px] text-32 font-medium text-hi md:text-48">Something went wrong on this page</h1>
      <p className="mt-6 max-w-[480px] text-16 text-mid">Nothing was signed or sent. Try again, or head back home.</p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={reset} className={buttonClass("primary", "lg")}>
          Try again
        </button>
        <Link href="/" className={buttonClass("secondary", "lg")}>
          Back home
        </Link>
      </div>
    </main>
  );
}
