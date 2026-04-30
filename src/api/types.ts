/**
 * Wire-format event from /v1/events. Mirrors the bot's NDJSON v1 layout
 * (audit/05 §3.1). Kept loose intentionally — extra payload fields are
 * tolerated and surfaced as an unknown record.
 */
export type BaseEvent = {
  type: string;
  seq: number;
  ts_utc_ms: number;
  idempotency_key: string;
  [extra: string]: unknown;
};

export type BotTickEvent = BaseEvent & {
  type: "bot_tick";
  pos_x: number;
  pos_y: number;
  pos_z: number;
  dimension: string;
  hp: number;
  tps: number;
  scanned_chunks: number;
  bases_found: number;
  flying: boolean;
  flight_state: string;
  wp_index: number;
  wp_total: number;
};

export type ChunksScannedBatchEvent = BaseEvent & {
  type: "chunks_scanned_batch";
  dimension: string;
  chunks: number[];
};

export type BaseFoundEvent = BaseEvent & {
  type: "base_found";
  chunk_x: number;
  chunk_z: number;
  dimension: string;
  base_type: string;
  score: number;
  world_x: number;
  world_y: number;
  world_z: number;
};

export type EventsResponse = {
  total: number;
  returned: number;
  events: BaseEvent[];
};

export type HealthResponse = {
  status: string;
  version: string;
  eventsReceived: number;
  eventsStored: number;
};
