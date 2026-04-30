import { useBotState } from "../api/useBotState";
import type { Dimension } from "../map/worldCoords";
import { ReviewModal } from "./ReviewModal";

/**
 * Thin host that picks the dimension to feed the review modal.
 * For now we follow the bot's current dimension (from bot_tick) so the
 * modal queue matches what the user is actively scanning. Falls back to
 * overworld if the bot is offline.
 *
 * Future: tie this to the BasesMap dim filter via a shared context if
 * we want the user to review a different dim from where the bot is.
 */
export function ReviewModalHost() {
  const bot = useBotState();
  const dim = (bot.latest?.dimension as Dimension) ?? "overworld";
  return <ReviewModal filterDim={dim} />;
}
