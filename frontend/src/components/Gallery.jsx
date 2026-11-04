// Presentational: the parent owns the data and the refresh.
export default function Gallery({ items }) {
  if (items.length === 0) {
    return (
      <p className="max-w-prose text-ink-soft">
        Aún no hay imágenes. Sube un JPG o PNG y su miniatura aparecerá aquí cuando el worker la
        procese.
      </p>
    );
  }

  return (
    <ul className="columns-2 gap-3 sm:columns-3 lg:columns-4">
      {items.map((item) => (
        <li key={item.id} className="mb-3 break-inside-avoid">
          <a
            href={item.originalUrl}
            target="_blank"
            rel="noreferrer"
            title={`Abrir ${item.name}`}
            className="group relative block overflow-hidden rounded-md bg-line"
          >
            <img
              src={item.thumbUrl}
              alt={item.name}
              width={item.width}
              height={item.height}
              className="h-auto w-full transition-transform duration-300 motion-safe:group-hover:scale-105"
            />
            <span className="absolute inset-x-0 bottom-0 truncate bg-ink/70 px-3 py-1.5 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {item.name}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
