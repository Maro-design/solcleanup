import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "lift inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border font-medium select-none disabled:cursor-not-allowed disabled:opacity-40";

const variants: Record<Variant, string> = {
  // Accent is earned: only the one primary action per screen.
  primary: "border-accent bg-accent text-[var(--on-accent)] hover:bg-[#5687e6] shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]",
  secondary: "border-line bg-raised text-hi hover:bg-overlay shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]",
  ghost: "border-transparent bg-transparent text-mid hover:text-hi hover:bg-raised",
  danger: "border-[rgb(185_58_38/0.4)] bg-[rgb(185_58_38/0.06)] text-danger hover:border-danger",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-14",
  md: "h-10 px-4 text-14",
  lg: "h-12 px-6 text-16",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

type ButtonProps = ComponentPropsWithoutRef<"button"> & { variant?: Variant; size?: Size; children: ReactNode };

export function Button({ variant = "secondary", size = "md", className = "", type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}

type LinkButtonProps = ComponentPropsWithoutRef<typeof Link> & { variant?: Variant; size?: Size };

export function LinkButton({ variant = "secondary", size = "md", className = "", ...rest }: LinkButtonProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
