// Shows the real path of an upload. `completed` is the number of finished steps (0 to 4).
const STEPS = [
  { title: "Guardado en S3", detail: "Original almacenado en el bucket de subidas", doing: "subiendo a S3" },
  { title: "En cola en SQS", detail: "Mensaje file.uploaded publicado", doing: "publicando en la cola SQS" },
  { title: "Procesado por el worker", detail: "Evento guardado en MongoDB", doing: "esperando al worker" },
  { title: "Miniatura", detail: "Copia de 320 px en S3, fila en PostgreSQL", doing: "generando la miniatura" },
];

function stateOf(index, completed) {
  if (completed === null) return "waiting";
  if (index < completed) return "done";
  return index === completed ? "active" : "waiting";
}

const BAR = {
  done: "bg-signal",
  active: "bg-tape motion-safe:animate-pulse",
  waiting: "bg-line",
};

export default function Pipeline({ job }) {
  const completed = job ? job.completed : null;
  const skipped = job && !job.isImage && completed === 4;

  let caption = "Sube un archivo para ver cómo recorre los servicios.";
  if (job?.note) caption = job.note;
  else if (job && completed < 4) caption = `${job.name}: ${STEPS[completed].doing}`;
  else if (job) {
    caption = skipped
      ? `${job.name}: guardado, no es una imagen y por eso no tiene miniatura`
      : `${job.name}: miniatura lista`;
  }

  return (
    <div>
      <ol className="grid gap-4 sm:grid-cols-4">
        {STEPS.map((step, index) => {
          const state = stateOf(index, completed);
          const isSkipped = skipped && index === 3;
          return (
            <li key={step.title} data-state={state}>
              <div className={`h-1.5 rounded-full transition-colors duration-500 ${isSkipped ? "bg-line" : BAR[state]}`} />
              <p className={`mt-3 font-medium ${state === "waiting" ? "text-ink-soft" : "text-ink"}`}>
                {isSkipped ? "Miniatura omitida" : step.title}
              </p>
              <p className="text-sm text-ink-soft">{step.detail}</p>
            </li>
          );
        })}
      </ol>
      <p role="status" className={`mt-4 text-sm ${job?.note ? "font-medium text-fail" : "text-ink-soft"}`}>
        {caption}
      </p>
    </div>
  );
}
