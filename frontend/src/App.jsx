import { useCallback, useEffect, useState } from "react";
import { getJson, uploadFile } from "./api.js";
import Dropzone from "./components/Dropzone.jsx";
import EventList from "./components/EventList.jsx";
import FileList from "./components/FileList.jsx";
import Gallery from "./components/Gallery.jsx";
import Pipeline from "./components/Pipeline.jsx";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(check, tries = 20, delay = 1000) {
  for (let i = 0; i < tries; i++) {
    if (await check()) return true;
    await sleep(delay);
  }
  return false;
}

// Container: owns the data and the upload flow. Everything it renders is presentational.
export default function App() {
  const [config, setConfig] = useState(null);
  const [files, setFiles] = useState([]);
  const [events, setEvents] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [error, setError] = useState("");
  const [job, setJob] = useState(null); // { name, isImage, completed, note }
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [cfg, f, e, g] = await Promise.all([
        getJson("/config"),
        getJson("/files"),
        getJson("/events"),
        getJson("/gallery"),
      ]);
      setConfig(cfg);
      setFiles(f);
      setEvents(e);
      setGallery(g);
      setError("");
    } catch (err) {
      setError(`No se pudo conectar con la API: ${err.message}. ¿Está el backend corriendo en el puerto 3000?`);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  async function handleUpload(file) {
    const isImage = file.type.startsWith("image/");
    const galleryBefore = gallery.length;
    setError("");
    setJob({ name: file.name, isImage, completed: 0, note: "" });

    let key;
    try {
      ({ key } = await uploadFile(file));
    } catch (err) {
      setJob(null);
      setError(`Falló la subida: ${err.message}`);
      return;
    }

    // The API has stored the file and queued the message at this point.
    setJob((j) => ({ ...j, completed: 2 }));
    await refresh();

    try {
      const processed = await waitFor(async () => (await getJson("/events")).some((e) => e.key === key));
      if (!processed) {
        setJob((j) => ({
          ...j,
          note: "El worker no tomó el mensaje. Verifica que npm run worker esté corriendo.",
        }));
        return;
      }
      setJob((j) => ({ ...j, completed: 3 }));
      if (isImage) await waitFor(async () => (await getJson("/gallery")).length > galleryBefore);
      // Load the new data first, so the step is never marked done before the gallery shows it.
      await refresh();
      setJob((j) => ({ ...j, completed: 4 }));
    } catch (err) {
      setError(err.message);
      await refresh();
    }
  }

  const busy = job !== null && job.completed < 4 && !job.note;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
      <header className="mb-10">
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
          {config?.greeting ?? "Laboratorio de nube local"}
        </h1>
        <p className="mt-3 max-w-prose text-ink-soft">
          Sube un archivo y sigue su recorrido por S3, SQS y el worker. El saludo viene de
          Parameter Store
          {config ? `, y la API leyó estos secretos sin exponerlos: ${config.secretKeys.join(", ")}` : ""}.
        </p>
      </header>

      {error && (
        <p role="alert" className="mb-8 rounded-lg border border-fail/40 bg-fail/10 px-4 py-3 font-medium text-fail">
          {error}
        </p>
      )}

      <Dropzone onFile={handleUpload} disabled={busy} />

      <section className="mt-8" aria-label="Progreso de la subida">
        <Pipeline job={job} />
      </section>

      <section className="mt-16">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Galería</h2>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-full border border-ink-soft/40 px-4 py-1.5 text-sm font-medium transition-colors hover:border-signal hover:text-signal-deep disabled:opacity-60"
          >
            {refreshing ? "Actualizando" : "Actualizar"}
          </button>
        </div>
        <Gallery items={gallery} />
      </section>

      <div className="mt-16 grid gap-12 md:grid-cols-2">
        <section>
          <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight">Archivos</h2>
          <FileList files={files} />
        </section>
        <section>
          <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight">Eventos procesados</h2>
          <EventList events={events} />
        </section>
      </div>
    </div>
  );
}
