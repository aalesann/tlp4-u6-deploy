import { formatSize, formatTime } from "../format.js";

export default function FileList({ files }) {
  if (files.length === 0) return <p className="text-ink-soft">Aún no se subió ningún archivo.</p>;

  return (
    <ul className="divide-y divide-line">
      {files.map((file) => (
        <li key={file.id} className="flex items-baseline justify-between gap-4 py-3">
          <div className="min-w-0">
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="block truncate font-medium text-signal-deep underline-offset-4 hover:underline"
            >
              {file.name}
            </a>
            <span className="text-sm text-ink-soft">{formatTime(file.createdAt)}</span>
          </div>
          <span className="shrink-0 text-sm tabular-nums text-ink-soft">{formatSize(file.size)}</span>
        </li>
      ))}
    </ul>
  );
}
