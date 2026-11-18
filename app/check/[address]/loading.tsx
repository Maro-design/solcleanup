/** Shown while the server scans a wallet for /check/<address>. */
import { PageShell } from "@/components/site/PageShell";

export default function Loading() {
  return (
    <PageShell>
      <section className="mx-auto w-full max-w-[1200px] px-6" aria-busy="true" aria-live="polite">
        <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-16">
          <div>
            <p className="heading text-32 font-medium text-hi md:text-48">Check any wallet</p>
            <p className="mt-6 max-w-[440px] text-16 text-mid">Reading the wallet&apos;s token accounts. This usually takes a few seconds.</p>
          </div>
          <div className="rounded-3xl border border-line bg-raised p-6 sm:p-8">
            <div className="flex items-center gap-3 text-14 text-mid">
              <span className="size-5 rounded-full border-2 border-line border-t-accent motion-safe:animate-spin" aria-hidden />
              Scanning wallet
            </div>
            <div className="mt-8 h-12 w-56 rounded-xl bg-overlay motion-safe:animate-pulse" />
            <div className="mt-8 h-2 w-full rounded-full bg-overlay" />
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[86px] rounded-2xl border border-line bg-base" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
