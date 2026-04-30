const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8080";

export type CoverageCell = { cx: number; cz: number; count: number };

export type CoverageResponse = {
  dim: string;
  grid: number;
  cellSizeBlocks: number;
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  cells: CoverageCell[];
  total: number;
};

export type CoverageQuery = {
  dim: string;
  grid: number;
  xmin: number;
  xmax: number;
  zmin: number;
  zmax: number;
};

export async function fetchCoverage(q: CoverageQuery): Promise<CoverageResponse> {
  const params = new URLSearchParams({
    dim: q.dim,
    grid: String(q.grid),
    xmin: String(Math.floor(q.xmin)),
    xmax: String(Math.ceil(q.xmax)),
    zmin: String(Math.floor(q.zmin)),
    zmax: String(Math.ceil(q.zmax)),
  });
  const res = await fetch(`${BASE_URL}/v1/coverage?${params}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
