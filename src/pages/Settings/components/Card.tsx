import type { ReactNode } from "react";

interface CardProps {
  title: ReactNode;
  subtitle: ReactNode;
  children: ReactNode;
}

export default function Card({ title, subtitle, children }: CardProps) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#191A1F]">
      <h3 className="text-sm font-bold text-ink-primary">{title}</h3>
      <p className="text-[11px] text-[#475569] dark:text-[#6D7A86] mt-0.5 mb-5">
        {subtitle}
      </p>
      {children}
    </div>
  );
}
