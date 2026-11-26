import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export const controlClass =
  "w-full rounded-[var(--input-radius)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 text-[15px] text-fg placeholder:text-subtle transition-colors hover:border-fg/40 focus:border-accent";

type Common = { label: string; hint?: ReactNode; className?: string };

function Shell({ id, label, hint, className = "", children }: Common & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fg">{label}</label>
      {children}
      {hint && <p id={`${id}-hint`} className="mt-1.5 text-xs text-subtle">{hint}</p>}
    </div>
  );
}

export function Field({ label, hint, className, ...input }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint} className={className}>
      <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} className={`${controlClass} h-11`} {...input} />
    </Shell>
  );
}

export function SelectField({ label, hint, className, children, ...select }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint} className={className}>
      <select id={id} className={`${controlClass} h-11`} {...select}>{children}</select>
    </Shell>
  );
}

export function TextareaField({ label, hint, className, ...area }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint} className={className}>
      <textarea id={id} className={`${controlClass} min-h-24 py-2.5`} {...area} />
    </Shell>
  );
}
