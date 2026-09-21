import { getQuery } from "h3";
import { getEventStats, getLeaderboard } from "../../utils/game-database";

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const department = typeof query.department === "string" ? query.department : undefined;
  const shift = typeof query.shift === "string" ? query.shift : undefined;

  const leaderboard = getLeaderboard(department, shift);
  const stats = getEventStats();

  return {
    leaderboard,
    stats,
    updatedAt: new Date().toISOString(),
  };
});

