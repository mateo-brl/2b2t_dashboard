import { useCallback, useEffect, useState } from "react";
import {
  createZone,
  deleteZone,
  listZones,
  updateZone,
  type Zone,
  type ZoneCreatePayload,
  type ZoneUpdatePayload,
} from "./zones";

export type UseZonesState = {
  zones: Zone[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  add: (payload: ZoneCreatePayload) => Promise<Zone>;
  patch: (id: number, payload: ZoneUpdatePayload) => Promise<Zone>;
  remove: (id: number) => Promise<void>;
};

export function useZones(dim: string): UseZonesState {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listZones(dim);
      setZones(data);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [dim]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const add = useCallback(async (payload: ZoneCreatePayload) => {
    const z = await createZone(payload);
    setZones((prev) => [...prev, z]);
    return z;
  }, []);

  const patch = useCallback(async (id: number, payload: ZoneUpdatePayload) => {
    const z = await updateZone(id, payload);
    setZones((prev) => prev.map((p) => (p.id === id ? z : p)));
    return z;
  }, []);

  const remove = useCallback(async (id: number) => {
    await deleteZone(id);
    setZones((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { zones, loading, error, reload, add, patch, remove };
}
