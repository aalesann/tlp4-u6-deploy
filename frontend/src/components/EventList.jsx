import { formatTime } from "../format.js";

export default function EventList({ events }) {
  if (events.length === 0) {
    return <p className="text-ink-soft">Aún no hay eventos. El worker registra uno por cada subida.</p>;
  }

  return (
    <ul className="divide-y divide-line">
      {events.map((event) => (
        <li key={event._id} className="py-3">
          <p className="truncate font-medium">{event.name}</p>
          <p className="text-sm text-ink-soft">
            {event.type}, procesado {formatTime(event.processedAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}
