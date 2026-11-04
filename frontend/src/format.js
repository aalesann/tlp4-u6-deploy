export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const time = new Intl.DateTimeFormat("es",{ dateStyle: "medium", timeStyle: "short" });

export const formatTime = (value) => time.format(new Date(value));
