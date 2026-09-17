type Props = {
  source: "sdk-observed" | "inferred";
  confidence: "high" | "low";
};

const STYLES: Record<string, string> = {
  "sdk-observed": "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  "inferred-high": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  "inferred-low": "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const LABELS: Record<string, string> = {
  "sdk-observed": "Observed live",
  "inferred-high": "Inferred",
  "inferred-low": "Inferred (low confidence)",
};

export function SourceBadge({ source, confidence }: Props) {
  const key = source === "sdk-observed" ? "sdk-observed" : `inferred-${confidence}`;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[key]}`}>
      {LABELS[key]}
    </span>
  );
}
