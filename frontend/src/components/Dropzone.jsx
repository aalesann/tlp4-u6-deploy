import { useState } from "react";

export default function Dropzone({ onFile, disabled }) {
  const [dragging, setDragging] = useState(false);

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !disabled) onFile(file);
  }

  function handleChange(event) {
    const file = event.target.files[0];
    if (file) onFile(file);
    event.target.value = "";
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={[
        "flex cursor-pointer flex-col items-start gap-4 rounded-3xl border-2 border-dashed px-6 py-10 transition-colors sm:px-10",
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-signal",
        dragging ? "border-signal bg-white" : "border-ink-soft/40 bg-paper hover:border-signal",
        disabled ? "pointer-events-none opacity-60" : "",
      ].join(" ")}
    >
      <input type="file" name="file" className="sr-only" onChange={handleChange} disabled={disabled} />
      <span className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        {dragging ? "Suelta para subir" : "Suelta un archivo aquí"}
      </span>
      <span className="max-w-prose text-ink-soft">
        Las imágenes generan una miniatura en la galería. Los demás archivos se guardan, pero la
        galería los omite. Tamaño máximo: 5 MB.
      </span>
      <span className="rounded-full bg-signal px-5 py-2 text-sm font-semibold text-white">
        Elegir archivo
      </span>
    </label>
  );
}
