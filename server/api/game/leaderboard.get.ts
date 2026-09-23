import { getQuery } from "h3";
import { getEventStats, getLeaderboard } from "../../utils/game-database";
import {
  computeLeaderboardFromSessions,
  computeStatsFromSessions,
  getRemoteSessions,
  isRemoteStorageConfigured,
} from "../../utils/remote-storage";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const department = typeof query.department === "string" ? query.department : undefined;
  const shift = typeof query.shift === "string" ? query.shift : undefined;

  let leaderboard = getLeaderboard(department, shift);
  let stats = getEventStats();

  if (isRemoteStorageConfigured()) {
    try {
      const remoteSessions = await getRemoteSessions();
      if (remoteSessions.length > 0) {
        leaderboard = computeLeaderboardFromSessions(remoteSessions, department, shift);
        stats = computeStatsFromSessions(remoteSessions);
      }
    } catch (err) {
      console.error("Error reading remote leaderboard:", err);
    }
  }

  return {
    leaderboard,
    stats,
    updatedAt: new Date().toISOString(),
  };
});

