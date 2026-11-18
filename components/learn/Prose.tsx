/**
 * Reading primitives for /learn articles. Server components, no client JS.
 * Type follows the site scale; measure is capped for comfortable reading.
 */
import Link from "next/link";
import type { ReactNode } from "react";

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div
      className={[
        "text-16 leading-7 text-mid",
        "[&>p]:mt-5 [&_strong]:font-medium [&_strong]:text-hi",
        "[&>ul]:mt-5 [&>ul]:list-disc [&>ul]:space-y-2 [&>ul]:pl-5 [&>ol]:mt-5 [&>ol]:list-decimal [&>ol]:space-y-2 [&>ol]:pl-5",
        "[&_li]:pl-1 [&_li]:marker:text-meta",
        "[&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:bg-overlay [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-14 [&_:not(pre)>code]:text-hi",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="heading mt-14 scroll-mt-28 text-32 font-medium text-hi">
      {children}
    </h2>
  );
}

export function H3({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="mt-10 scroll-mt-28 text-20 font-medium text-hi">
      {children}
    </h3>
  );
}

/** Internal link. */
export function L({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-accent-ink underline decoration-[rgb(100_149_237/0.4)] underline-offset-4 hover:decoration-accent">
      {children}
    </Link>
  );
}

/** External link (citations). */
export function X({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-ink underline decoration-[rgb(100_149_237/0.4)] underline-offset-4 hover:decoration-accent">
      {children}
    </a>
  );
}

export function Pre({ label, children }: { label?: string; children: string }) {
  return (
    <figure className="mt-5 overflow-hidden rounded-2xl border border-line bg-raised">
      {label && <figcaption className="border-b border-line px-5 py-2.5 text-12 text-meta">{label}</figcaption>}
      <pre className="overflow-x-auto px-5 py-4 font-mono text-14 leading-6 text-hi">
        <code>{children}</code>
      </pre>
    </figure>
  );
}

export function Table({ head, rows, caption }: { head: string[]; rows: ReactNode[][]; caption?: string }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[520px] border-collapse text-left text-14">
        {caption && <caption className="border-b border-line px-4 py-2.5 text-left text-12 text-meta">{caption}</caption>}
        <thead>
          <tr className="bg-raised">
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-medium text-hi">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="px-4 py-3 align-top text-mid">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <aside className="mt-6 rounded-2xl border border-line bg-raised px-5 py-4 text-14 leading-6 text-mid">{children}</aside>;
}
