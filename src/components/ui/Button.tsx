import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--button-primary-bg)] font-semibold text-[var(--button-primary-fg)] hover:bg-[var(--button-primary-bg-hover)] disabled:hover:bg-[var(--button-primary-bg)]",
  secondary:
    "bg-[var(--button-secondary-bg)] text-fg border border-[var(--button-secondary-border)] hover:border-fg shadow-sm",
  ghost: "text-muted hover:text-fg hover:bg-sunken",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-[15px] gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `inline-flex items-center justify-center whitespace-nowrap rounded-[var(--button-radius)] font-medium transition-colors duration-[var(--duration-fast)] disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${sizes[size]} ${extra}`;
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; href?: string; children: ReactNode };

export default function Button({ variant = "primary", size = "md", href, className = "", children, ...rest }: Props) {
  const cls = buttonClass(variant, size, className);
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button className={cls} {...rest}>{children}</button>;
}
