export default function StatCard({
  label,
  value,
  tone = "default",
  sublabel,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "amber" | "red" | "accent";
  sublabel?: string;
}) {
  const toneClasses = {
    default: "text-ink",
    amber: "text-amber",
    red: "text-red",
    accent: "text-accent",
  }[tone];

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneClasses}`}>
        {value}
      </p>
      {sublabel && <p className="mt-0.5 text-xs text-ink-muted">{sublabel}</p>}
    </div>
  );
}
