const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8080";

export type CommandType =
  | "basefinder.toggle"
  | "basefinder.enable"
  | "basefinder.disable"
  | "basefinder.pause"
  | "basefinder.resume"
  | "basefinder.skip"
  | "basefinder.delete-base";

export type CommandRecord = {
  id: number;
  type: string;
  payload: Record<string, unknown>;
  createdAt: number;
  ackAt: number | null;
};

export async function postCommand(
  type: CommandType,
  payload?: Record<string, unknown>,
): Promise<CommandRecord> {
  const res = await fetch(`${BASE_URL}/v1/commands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, payload: payload ?? {} }),
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json();
}
