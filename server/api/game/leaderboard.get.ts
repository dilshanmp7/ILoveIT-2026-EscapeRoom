import { getQuery } from "h3";
import { getEventStats, getLeaderboard, readGameSession } from "../../utils/game-database";
import {
  computeLeaderboardFromSessions,
  computeStatsFromSessions,
  getRemoteSessions,
  isRemoteStorageConfigured,
  saveRemoteSession,
} from "../../utils/remote-storage";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const department = typeof query.department === "string" ? query.department : undefined;
  const shift = typeof query.shift === "string" ? query.shift : undefined;

  let leaderboard = getLeaderboard(department, shift);
  let stats = getEventStats();

  if (isRemoteStorageConfigured()) {
    try {
      let remoteSessions = await getRemoteSessions();

      // If Upstash Redis is freshly connected and empty, seed it from local SQLite sessions
      if (remoteSessions.length === 0) {
        const localEntries = getLeaderboard();
        for (const entry of localEntries) {
          const mapped = readGameSession(entry.id);
          if (mapped?.session) {
            void saveRemoteSession(mapped.session);
          }
        }
        remoteSessions = await getRemoteSessions();
      }

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

