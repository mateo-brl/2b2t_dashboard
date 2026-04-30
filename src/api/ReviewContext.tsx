import { createContext, useContext, useState, type ReactNode } from "react";
import { useReviewMap, type ReviewMap } from "./useReviewMap";
import type { ReviewStatus } from "./reviews";

type ReviewContextValue = {
  map: ReviewMap;
  loading: boolean;
  refresh: () => Promise<void>;
  markLocally: (baseKey: string, status: ReviewStatus) => void;
  // Cross-component UI bus: who controls the modal and which base is open.
  modalOpen: boolean;
  openModal: (baseKey?: string) => void;
  closeModal: () => void;
  selectedBaseKey: string | null;
  setSelectedBaseKey: (key: string | null) => void;
};

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function ReviewProvider({ children }: { children: ReactNode }) {
  const { map, loading, refresh, markLocally } = useReviewMap();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBaseKey, setSelectedBaseKey] = useState<string | null>(null);

  const openModal = (baseKey?: string) => {
    if (baseKey) setSelectedBaseKey(baseKey);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  return (
    <ReviewContext.Provider
      value={{
        map,
        loading,
        refresh,
        markLocally,
        modalOpen,
        openModal,
        closeModal,
        selectedBaseKey,
        setSelectedBaseKey,
      }}
    >
      {children}
    </ReviewContext.Provider>
  );
}

export function useReview(): ReviewContextValue {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error("useReview must be used inside <ReviewProvider>");
  return ctx;
}
