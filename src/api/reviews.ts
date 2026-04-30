const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8080";

export type ReviewStatus = "PENDING" | "REAL" | "FALSE_POSITIVE" | "INTERESTING";

export type Review = {
  baseKey: string;
  status: ReviewStatus;
  notes: string | null;
  reviewedAt: number;
};

export type ReviewCounts = {
  pending: number;
  real: number;
  falsePositive: number;
  interesting: number;
};

function encodeKey(key: string): string {
  return encodeURIComponent(key);
}

export async function fetchReviewCounts(): Promise<ReviewCounts> {
  const res = await fetch(`${BASE_URL}/v1/reviews/counts`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function fetchReview(baseKey: string): Promise<Review | null> {
  const res = await fetch(`${BASE_URL}/v1/bases/${encodeKey(baseKey)}/review`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function fetchReviewsByStatus(
  status: ReviewStatus,
  limit = 100,
): Promise<Review[]> {
  const res = await fetch(
    `${BASE_URL}/v1/reviews?status=${status}&limit=${limit}`,
  );
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const data = (await res.json()) as { total: number; reviews: Review[] };
  return data.reviews;
}

export async function postReview(
  baseKey: string,
  status: ReviewStatus,
  notes?: string,
): Promise<Review> {
  const res = await fetch(
    `${BASE_URL}/v1/bases/${encodeKey(baseKey)}/review`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes }),
    },
  );
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function deleteReview(baseKey: string): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/v1/bases/${encodeKey(baseKey)}/review`,
    { method: "DELETE" },
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
}
