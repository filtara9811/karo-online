import { type ReactNode } from "react";

export function Section({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24 ${className}`}>
      {children}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  center = true,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  center?: boolean;
}) {
  return (
    <div className={`mb-12 ${center ? "text-center max-w-2xl mx-auto" : ""}`}>
      {eyebrow && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/5 text-[#f5d97a] text-xs font-medium uppercase tracking-[0.18em] mb-4">
          {eyebrow}
        </div>
      )}
      <h2 className="font-display text-3xl md:text-5xl text-white leading-tight">{title}</h2>
      {subtitle && <p className="mt-4 text-white/60 text-base md:text-lg leading-relaxed">{subtitle}</p>}
    </div>
  );
}

export function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="ko-glass rounded-2xl p-6 hover:border-[#d4af37]/40 transition-colors">
      <div
        className="h-11 w-11 rounded-xl grid place-items-center mb-4 text-[#1a1208]"
        style={{ background: "linear-gradient(180deg,#fff3c8,#d4af37 60%,#8b6508)" }}
      >
        {icon}
      </div>
      <h3 className="font-display text-xl text-white mb-2">{title}</h3>
      <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
    </div>
  );
}
