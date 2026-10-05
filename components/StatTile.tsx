type Props = {
  label: string;
  value: string;
  detail?: string;
};

export function StatTile({ label, value, detail }: Props) {
  return (
    <div className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 truncate text-2xl font-semibold" title={value}>
        {value}
      </div>
      {detail && <div className="mt-0.5 truncate text-xs text-zinc-500" title={detail}>{detail}</div>}
    </div>
  );
}
