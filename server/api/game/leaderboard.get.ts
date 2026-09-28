import type { EventStats, LeaderboardEntry } from "#shared/game/types";
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

  let leaderboard: LeaderboardEntry[] = [];
  let stats: EventStats = {
    totalRegistered: 0,
    totalCompleted: 0,
    fastestTimeSeconds: null,
    topDepartment: null,
    averageScore: 0,
  };

  // Primary: Use remote Upstash Redis storage if configured (Vercel / Cloud production)
  if (isRemoteStorageConfigured()) {
    try {
      const remoteSessions = await getRemoteSessions();
      leaderboard = computeLeaderboardFromSessions(remoteSessions, department, shift);
      stats = computeStatsFromSessions(remoteSessions);
      return {
        leaderboard,
        stats,
        updatedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error("Error reading remote leaderboard:", err);
    }
  }

  // Fallback: Local SQLite storage (local development / self-hosted node server)
  try {
    leaderboard = getLeaderboard(department, shift);
    stats = getEventStats();
  } catch (err) {
    console.error("Error reading local SQLite leaderboard:", err);
  }

  return {
    leaderboard,
    stats,
    updatedAt: new Date().toISOString(),
  };
});

