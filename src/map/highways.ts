import L from "leaflet";
import { DIMENSIONS, type Dimension, worldToLatLng } from "./worldCoords";

/**
 * 2b2t highway segments per dimension.
 *
 * - **Axes** : X=0 et Z=0 traversent la border d'un bord à l'autre.
 * - **Diagonales** : X=Z et X=-Z (les "diags" NE/NW/SE/SW) — utilisées en
 *   masse pour les voyages longue distance via Nether.
 *
 * Représenté en world coords ; le rendu utilise {@link worldToLatLng}.
 */
type Segment = {
  name: string;
  points: Array<[number, number]>; // [x, z]
};

function axesAndDiagonals(border: number): Segment[] {
  const b = border;
  return [
    { name: "X axis", points: [[-b, 0], [b, 0]] },
    { name: "Z axis", points: [[0, -b], [0, b]] },
    { name: "NE/SW diag", points: [[-b, -b], [b, b]] },
    { name: "NW/SE diag", points: [[-b, b], [b, -b]] },
  ];
}

const HIGHWAYS: Record<Dimension, Segment[]> = {
  overworld: axesAndDiagonals(DIMENSIONS.overworld.border),
  nether: axesAndDiagonals(DIMENSIONS.nether.border),
  end: [], // No standardised highways in the End.
};

/**
 * Build a Leaflet layer group of highway polylines for the given dimension.
 * Returns an empty layer for End.
 */
export function highwaysLayer(dim: Dimension): L.LayerGroup {
  const meta = DIMENSIONS[dim];
  const group = L.layerGroup();
  for (const seg of HIGHWAYS[dim]) {
    const latlngs = seg.points.map(([x, z]) => worldToLatLng(x, z));
    L.polyline(latlngs, {
      color: meta.accent,
      weight: 1.5,
      opacity: 0.45,
      dashArray: "6 6",
      interactive: false,
    })
      .bindTooltip(seg.name, { sticky: true, opacity: 0.8 })
      .addTo(group);
  }

  // World border outline
  const b = meta.border;
  L.polyline(
    [
      worldToLatLng(-b, -b),
      worldToLatLng(b, -b),
      worldToLatLng(b, b),
      worldToLatLng(-b, b),
      worldToLatLng(-b, -b),
    ],
    {
      color: meta.accent,
      weight: 1,
      opacity: 0.35,
      interactive: false,
    },
  ).addTo(group);

  return group;
}
