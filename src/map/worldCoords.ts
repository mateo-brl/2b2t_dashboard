import L from "leaflet";

/**
 * Leaflet CRS.Simple convertit lat/lng → pixels en identité. On choisit la
 * convention :
 *   lat = -mcZ   (Nord = haut, Z+ = sud)
 *   lng =  mcX   (Est = droite, X+ = est)
 *
 * Ça nous laisse manipuler des coords Minecraft natives partout (pas de
 * SCALE arbitraire), et Leaflet rend correctement avec une orientation
 * cardinale familière.
 */
export function worldToLatLng(x: number, z: number): L.LatLngExpression {
  return [-z, x];
}

export function latLngToWorld(ll: L.LatLng): { x: number; z: number } {
  return { x: ll.lng, z: -ll.lat };
}

export type Dimension = "overworld" | "nether" | "end";

export type DimensionMeta = {
  /** World border (blocks). 2b2t uses vanilla default. */
  border: number;
  /** Color hint for highways and outline. */
  accent: string;
  /** Background fill when no chunks are explored. */
  background: string;
  label: string;
};

export const DIMENSIONS: Record<Dimension, DimensionMeta> = {
  overworld: {
    border: 29_999_984,
    accent: "#3b82f6",
    background: "#0b0d12",
    label: "Overworld",
  },
  nether: {
    // Nether border: vanilla default ÷ 8 ≈ 3,749,998 blocks (Nether coords).
    border: 3_749_998,
    accent: "#ef4444",
    background: "#1a0a0a",
    label: "Nether",
  },
  end: {
    border: 29_999_984,
    accent: "#a855f7",
    background: "#0a0814",
    label: "End",
  },
};

/**
 * Leaflet bounds englobant la worldborder pour la dimension donnée.
 * Padding ×1.05 pour laisser un peu d'air au bord.
 */
export function dimensionBounds(dim: Dimension): L.LatLngBoundsExpression {
  const b = DIMENSIONS[dim].border * 1.05;
  return [
    [-b, -b],
    [b, b],
  ];
}
