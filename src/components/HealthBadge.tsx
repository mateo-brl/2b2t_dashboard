import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "../api/client";

export function HealthBadge() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 2000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <span className="h-2 w-2 rounded-full bg-zinc-600" />
        connecting…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-400">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        backend unreachable
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-300">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      <span className="font-medium">backend</span>
      <span className="text-zinc-500">v{data.version}</span>
      <span className="ml-2 text-zinc-500">
        {data.eventsStored.toLocaleString()} stored ·{" "}
        {data.eventsReceived.toLocaleString()} received this session
      </span>
    </div>
  );
}
