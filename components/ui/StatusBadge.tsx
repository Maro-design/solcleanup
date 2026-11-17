import type { AccountStatus } from "@/lib/scan";

const styles: Record<AccountStatus, { label: string; dot: string; text: string }> = {
  empty: { label: "Empty", dot: "bg-hi", text: "text-hi" },
  dust: { label: "Dust · burnable", dot: "bg-warn", text: "text-hi" },
  protected: { label: "Protected", dot: "bg-low", text: "text-mid" },
};

export function StatusBadge({ status }: { status: AccountStatus }) {
  const s = styles[status];
  return (
    <span className={`inline-flex items-center gap-2 text-12 ${s.text}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}
