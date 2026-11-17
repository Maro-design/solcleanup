"use client";

/**
 * Rewards dashboard: who's connected, what you've earned, and your code and
 * link. Users can pick their own code (signed with their wallet). Earnings
 * arrive on-chain inside each referred claim, so there is nothing to withdraw.
 */
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Coins, Copy, Link2, Loader2, Pencil, Shuffle, X, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { FEE_PERCENT_LABEL, REFERRAL_CODE_RE, REFERRAL_SHARE_BPS, referralCodeMessage } from "@/lib/config";
import { formatSol, shortAddress } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { ConnectButton } from "@/components/ui/ConnectButton";

const SHARE = `${REFERRAL_SHARE_BPS / 100}%`;
const ease = [0.16, 1, 0.3, 1] as const;

type Data =
  | { s: "idle" }
  | { s: "loading" }
  | { s: "off" }
  | { s: "error"; message: string }
  | { s: "none" }
  | { s: "ready"; code: string; claims: number; earnedLamports: number };

const card = "rounded-3xl border border-line bg-raised shadow-[0_24px_56px_-32px_rgb(var(--shadow-ink)/0.5)]";

function Tile({ label, children, accent = false }: { label: string; children: ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "border-[rgb(100_149_237/0.35)] bg-[rgb(100_149_237/0.06)]" : "border-line bg-base"}`}>
      <p className="text-12 text-meta">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Step({ icon: Icon, title, text, i }: { icon: LucideIcon; title: string; text: string; i: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease, delay: i * 0.08 }}
      className="flex gap-4 rounded-2xl border border-line bg-raised p-5"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[rgb(100_149_237/0.3)] bg-[rgb(100_149_237/0.12)] text-accent-ink">
        <Icon size={18} strokeWidth={1.75} aria-hidden />
      </span>
      <div>
        <p className="text-14 font-medium text-hi">{title}</p>
        <p className="mt-1 text-14 text-mid">{text}</p>
      </div>
    </motion.li>
  );
}

export function RewardsView() {
  const { publicKey, signMessage } = useWallet();
  const { connection } = useConnection();
  const wallet = publicKey?.toBase58() ?? null;

  const [data, setData] = useState<Data>({ s: "idle" });
  const [funded, setFunded] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async (w: string) => {
    setData({ s: "loading" });
    try {
      const res = await fetch(`/api/referral?wallet=${encodeURIComponent(w)}`);
      if (res.status === 503) return setData({ s: "off" });
      if (!res.ok) return setData({ s: "error", message: "Couldn't load your rewards" });
      const d = (await res.json()) as { code: string | null; claims?: number; earnedLamports?: number };
      setData(d.code ? { s: "ready", code: d.code, claims: d.claims ?? 0, earnedLamports: d.earnedLamports ?? 0 } : { s: "none" });
    } catch {
      setData({ s: "error", message: "Couldn't load your rewards" });
    }
  }, []);

  useEffect(() => {
    setEditing(false);
    setFormError(null);
    if (!wallet || !publicKey) {
      setData({ s: "idle" });
      setFunded(null);
      return;
    }
    void load(wallet);
    // Rewards smaller than the rent-exempt minimum can't land in an empty wallet.
    void Promise.all([connection.getBalance(publicKey, "confirmed"), connection.getMinimumBalanceForRentExemption(0)])
      .then(([bal, min]) => setFunded(bal >= min))
      .catch(() => setFunded(null));
  }, [wallet, publicKey, load, connection]);

  /** Let the server pick a code (no signature needed). */
  const generate = async () => {
    if (!wallet) return;
    setSaving(true);
    setFormError(null);
    const res = await fetch("/api/referral", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ wallet }) }).catch(() => null);
    setSaving(false);
    if (!res || res.status === 503) return setData({ s: "off" });
    if (!res.ok) return setFormError("Couldn't create your code");
    setEditing(false);
    await load(wallet);
  };

  /** Save a code the user typed. The wallet signs a free message to prove ownership. */
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    const code = draft.trim().toLowerCase();
    if (!REFERRAL_CODE_RE.test(code)) return setFormError("Use 3–16 characters: letters, numbers, - or _");
    if (data.s === "ready" && data.code === code) return setEditing(false);
    if (!signMessage) return setFormError("Your wallet can't sign messages. Use Generate instead");
    setSaving(true);
    setFormError(null);
    try {
      const issuedAt = Date.now();
      const domain = window.location.host;
      const sig = await signMessage(new TextEncoder().encode(referralCodeMessage(domain, wallet, code, issuedAt)));
      const signature = btoa(String.fromCharCode(...sig));
      const res = await fetch("/api/referral", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain, wallet, code, issuedAt, signature }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 503) return setData({ s: "off" });
      if (!res.ok) return setFormError(body.error ?? "Couldn't save your code");
      setEditing(false);
      await load(wallet);
    } catch {
      setFormError("Signing was cancelled. Your code didn't change");
    } finally {
      setSaving(false);
    }
  };

  const code = data.s === "ready" ? data.code : null;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = code ? `${origin}/?ref=${code}` : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the link is still selectable */
    }
  };

  const showForm = wallet && (data.s === "none" || editing);
  const status = !wallet ? "Offline" : !code ? "No code" : funded === false ? "Add SOL" : "Active";

  return (
    <section aria-labelledby="rewards-title" className="mx-auto w-full max-w-[1200px] px-6">
      {/* Header */}
      <div className={`${card} flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8`}>
        <div className="max-w-[560px]">
          <h1 id="rewards-title" className="heading text-32 font-medium text-hi">
            Rewards dashboard
          </h1>
          <p className="mt-2 text-16 text-mid">Share your referral link, track what you&apos;ve earned and how many claims you&apos;ve brought in.</p>
        </div>
        {wallet ? (
          <div className="shrink-0 rounded-2xl border border-line bg-base px-4 py-3">
            <p className="text-12 text-meta">Connected wallet</p>
            <p className="mt-1 font-mono text-14 text-accent-ink">{shortAddress(wallet, 6)}</p>
          </div>
        ) : (
          <ConnectButton variant="primary" size="lg" />
        )}
      </div>

      {data.s === "off" && wallet && (
        <p className="mt-6 rounded-2xl border border-line bg-raised p-5 text-14 text-mid">
          {process.env.NODE_ENV === "development" ? (
            <>
              <span className="text-warn">Developer note:</span> the server has no database key yet. Paste your Supabase secret key into{" "}
              <code className="font-mono text-hi">SUPABASE_SECRET_KEY=</code> in <code className="font-mono text-hi">.env.local</code>, then restart the dev
              server. Visitors only ever see &quot;Rewards aren&apos;t switched on yet&quot;.
            </>
          ) : (
            "Rewards aren't switched on yet. Check back soon."
          )}
        </p>
      )}
      {data.s === "error" && <p className="mt-6 rounded-2xl border border-line bg-raised p-5 text-14 text-danger">{data.message}. Try again in a moment.</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Earnings */}
        <div className={`${card} relative overflow-hidden p-6 sm:p-8`}>
          <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-accent opacity-[0.10] blur-3xl" />
          <h2 className="display relative text-32 font-medium text-hi md:text-48">Bring your friends and start earning</h2>
          <p className="relative mt-4 max-w-[520px] text-16 text-mid">
            Get {SHARE} of our fee every time someone you invited claims through SolCleanup. They pay the normal {FEE_PERCENT_LABEL}, nothing extra.
          </p>
          <p className="relative mt-3 max-w-[520px] text-12 text-meta">
            Paid on-chain in the same transaction as their claim. Keep at least 0.001 SOL in your wallet to receive rewards.
          </p>
          <div className="relative mt-8 grid gap-4 sm:grid-cols-2">
            <Tile label="SOL earned" accent>
              <p className="font-mono text-32 leading-none text-accent-ink tnum">
                {data.s === "ready" ? formatSol(data.earnedLamports) : "0"} <span className="text-14 text-accent-dim">SOL</span>
              </p>
            </Tile>
            <Tile label="Referred claims">
              <p className="font-mono text-32 leading-none text-hi tnum">{data.s === "ready" ? data.claims.toLocaleString("en-US") : "0"}</p>
            </Tile>
          </div>
        </div>

        {/* Code + link */}
        <div className={`${card} p-6 sm:p-8`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-12 text-meta">Current code</p>
              {data.s === "loading" ? (
                <p className="mt-2 flex items-center gap-2 text-14 text-mid">
                  <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden /> Loading…
                </p>
              ) : (
                <p className={`mt-1 truncate font-mono text-32 ${code ? "text-accent-ink" : "text-low"}`}>{code ?? "—"}</p>
              )}
            </div>
            {code && !editing && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(code);
                  setFormError(null);
                  setEditing(true);
                }}
              >
                <Pencil size={14} strokeWidth={1.75} aria-hidden />
                Change
              </Button>
            )}
          </div>
          <p className="mt-3 text-14 text-mid">
            {wallet ? "Share this link so your friends' claims are credited to your wallet." : "Connect your wallet to get your own code and link."}
          </p>

          <AnimatePresence initial={false} mode="wait">
            {showForm ? (
              <motion.form
                key="form"
                onSubmit={(e) => void save(e)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease }}
                className="mt-6"
              >
                <label htmlFor="ref-code" className="text-14 text-hi">
                  {code ? "Choose a new code" : "Choose your code"}
                </label>
                <div className="mt-2 flex h-12 items-center rounded-xl border border-line bg-base pl-4 focus-within:border-line-hover">
                  <span className="shrink-0 font-mono text-12 text-meta">?ref=</span>
                  <input
                    id="ref-code"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 16))}
                    placeholder="yourname"
                    autoComplete="off"
                    spellCheck={false}
                    className="h-full min-w-0 flex-1 bg-transparent px-1 font-mono text-14 text-hi outline-none placeholder:text-low"
                  />
                </div>
                <p className="mt-2 text-12 text-meta">
                  3–16 characters: letters, numbers, - or _. Your wallet signs a free message to confirm. {code ? "Old links stop working." : ""}
                </p>
                {formError && <p className="mt-2 text-12 text-danger" role="alert">{formError}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="submit" variant="primary" disabled={saving || draft.length < 3}>
                    {saving ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Check size={16} strokeWidth={2} aria-hidden />}
                    Save code
                  </Button>
                  {!code && (
                    <Button type="button" variant="secondary" disabled={saving} onClick={() => void generate()}>
                      <Shuffle size={16} strokeWidth={1.75} aria-hidden />
                      Generate one
                    </Button>
                  )}
                  {code && (
                    <Button type="button" variant="ghost" disabled={saving} onClick={() => setEditing(false)}>
                      <X size={16} strokeWidth={1.75} aria-hidden />
                      Cancel
                    </Button>
                  )}
                </div>
              </motion.form>
            ) : (
              <motion.div key="link" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease }} className="mt-6">
                <p className="text-14 text-hi">Referral link</p>
                <div className="mt-2 flex h-12 items-center gap-2 rounded-xl border border-line bg-base pl-4 pr-1.5">
                  <input
                    readOnly
                    value={link || (wallet ? "" : "Connect to see your link")}
                    aria-label="Your referral link"
                    onFocus={(e) => e.currentTarget.select()}
                    className="h-full min-w-0 flex-1 bg-transparent font-mono text-14 text-hi outline-none"
                  />
                  <button
                    type="button"
                    disabled={!link}
                    onClick={() => void copy()}
                    aria-label={copied ? "Link copied" : "Copy link"}
                    className="lift inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-raised text-mid hover:text-hi disabled:opacity-40"
                  >
                    {copied ? <Check size={16} strokeWidth={2} className="text-accent-ink" aria-hidden /> : <Copy size={16} strokeWidth={1.75} aria-hidden />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <Tile label="Reward share">
              <p className="text-20 font-medium text-hi">{SHARE}</p>
            </Tile>
            <Tile label="Status">
              <p className={`flex items-center gap-2 text-20 font-medium ${status === "Active" ? "text-hi" : "text-mid"}`}>
                <span className={`size-2 rounded-full ${status === "Active" ? "bg-accent" : status === "Add SOL" ? "bg-warn" : "bg-low"}`} aria-hidden />
                <span className="truncate">{status}</span>
              </p>
              {status === "Add SOL" && <p className="mt-1 text-12 text-warn">Keep 0.001 SOL here to receive rewards</p>}
            </Tile>
          </div>
        </div>
      </div>

      {/* How it works */}
      <ol className="mt-6 grid gap-4 md:grid-cols-2">
        <Step i={0} icon={Link2} title="Share your link" text="Anyone who opens it is remembered as your invite for 30 days." />
        <Step i={1} icon={Coins} title="You're paid instantly" text={`${SHARE} of that fee lands in your wallet in the same transaction.`} />
      </ol>
    </section>
  );
}
