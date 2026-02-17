type EventPayload = Record<string, unknown>;

interface EventLogEntry {
  readonly timestamp: string;
  readonly eventType: string;
  readonly payload: EventPayload;
}

export function logEvent(eventType: string, payload: EventPayload = {}): void {
  const entry: EventLogEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    payload,
  };
  console.log(JSON.stringify(entry));
}
