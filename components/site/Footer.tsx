import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { FooterWordmark } from "./FooterWordmark";
import { FEE_WALLET, GITHUB_URL, VALUE_THRESHOLD_USD, X_URL, solscanAccount } from "@/lib/config";

export function Footer() {
  const social = [
    { label: "GitHub", href: GITHUB_URL },
    { label: "X", href: X_URL },
  ].filter((s) => s.href);

  return (
    <footer className="overflow-hidden border-t border-line">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-6 py-16 md:grid-cols-[1fr_auto]">
        <div className="max-w-[560px]">
          <Logo />
          <p className="mt-4 text-14 text-mid">
            SolCleanup is non-custodial. It never has access to your keys or funds; every transaction is built in your browser and
            signed by your wallet.
          </p>
          <div className="mt-6">
            <p className="text-12 text-meta">Service fee wallet</p>
            <a
              href={solscanAccount(FEE_WALLET)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-2 rounded break-all font-mono text-12 text-mid hover:text-hi"
            >
              {FEE_WALLET}
              <ExternalLink size={12} strokeWidth={1.5} className="shrink-0" aria-hidden />
              <span className="sr-only">(view on Solscan)</span>
            </a>
          </div>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-14 md:flex-col">
            {[
              { href: "/check", label: "Check a wallet" },
              { href: "/how-it-works", label: "How it works" },
              { href: "/learn", label: "Learn" },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-mid hover:text-hi">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/docs" className="text-mid hover:text-hi">
                Docs
              </Link>
            </li>
            <li>
              <Link href="/faq" className="text-mid hover:text-hi">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/safety" className="text-mid hover:text-hi">
                Safety
              </Link>
            </li>
            {social.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-mid hover:text-hi">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-[1200px] px-6 py-6 text-12 text-meta">
          Not financial advice. Closing an account is permanent; SolCleanup closes empty accounts, and burns dust under ${VALUE_THRESHOLD_USD} only when you choose to. Use at your own
          discretion.
        </p>
      </div>
      <FooterWordmark />
    </footer>
  );
}
