import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ConnectButton } from "@/components/ui/ConnectButton";
import { buttonClass } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

/** The page ends on the value, not on the disclaimer. */
export function ClosingCta() {
  return (
    <section aria-labelledby="closing-title" className="mx-auto w-full max-w-[1200px] px-6">
      <Reveal className="flex flex-col gap-8 rounded-2xl border border-line bg-raised p-8 md:flex-row md:items-center md:justify-between md:p-12">
        <div>
          <h2 id="closing-title" className="heading text-32 font-medium text-hi">
            See what your wallet is holding back
          </h2>
          <p className="mt-4 max-w-[520px] text-16 text-mid">
            The scan is read-only and takes seconds. You decide what to close after you&apos;ve seen the exact numbers.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <ConnectButton variant="primary" size="lg" />
          <Link href="/check" className={buttonClass("secondary", "lg")}>
            Check any wallet
            <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
