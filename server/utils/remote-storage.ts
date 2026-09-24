import { type EventStats, type GameSession, type LeaderboardEntry, calculateScore } from "#shared/game/types";
import { Redis } from "@upstash/redis";

let redisClient: Redis | null = null;
let redisInitialized = false;

function getRedis(): Redis | null {
  if (redisInitialized) return redisClient;
  redisInitialized = true;

  // 1. Try Redis.fromEnv() (standard Upstash and Vercel KV)
  try {
    redisClient = Redis.fromEnv();
    return redisClient;
  } catch {
    // fromEnv throws if standard vars are missing, fallback below
  }

  // 2. Fallback to custom environment variable names
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_API_URL ||
    process.env.REDIS_REST_API_URL ||
    process.env.UPSTASH_REST_API_URL;

  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_API_TOKEN ||
    process.env.REDIS_REST_API_TOKEN ||
    process.env.UPSTASH_REST_API_TOKEN;

  if (url && token) {
    try {
      redisClient = new Redis({
        url: url.replace(/\/$/, ""),
        token,
      });
      return redisClient;
    } catch (err) {
      console.error("Failed to initialize Upstash Redis with custom env:", err);
    }
  }

  return null;
}

export function isRemoteStorageConfigured(): boolean {
  return Boolean(getRedis());
}

export async function saveRemoteSession(session: GameSession): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    await redis.hset("cph_sessions", {
      [session.id]: JSON.stringify(session),
    });
    return true;
  } catch (err) {
    console.error("Failed to save session to Upstash Redis:", err);
    return false;
  }
}

export async function getRemoteSessionByIdOrCode(key: string): Promise<GameSession | null> {
  const redis = getRedis();
  if (!redis || !key) return null;

  try {
    // 1. Direct ID lookup in cph_sessions hash
    const direct = await redis.hget<string | GameSession>("cph_sessions", key);
    if (direct) {
      return typeof direct === "string" ? JSON.parse(direct) : (direct as GameSession);
    }

    // 2. Scan sessions for matching userCode or sessionKey
    const all = await getRemoteSessions();
    const cleanKey = key.trim().toLowerCase();
    return (
      all.find(
        (s) =>
          (s.id && s.id.toLowerCase() === cleanKey) ||
          (s.userCode && s.userCode.toLowerCase() === cleanKey) ||
          (s.sessionKey && s.sessionKey.toLowerCase() === cleanKey),
      ) || null
    );
  } catch (err) {
    console.error("Failed to find session in Upstash Redis:", err);
    return null;
  }
}

export async function getRemoteSessions(): Promise<GameSession[]> {
  const redis = getRedis();
  if (!redis) return [];

  try {
    const rawMap = await redis.hgetall<Record<string, unknown>>("cph_sessions");
    if (!rawMap) return [];

    const sessions: GameSession[] = [];
    for (const val of Object.values(rawMap)) {
      try {
        const item = typeof val === "string" ? JSON.parse(val) : val;
        if (item && item.id) {
          sessions.push(item as GameSession);
        }
      } catch {
        // Ignore parse error
      }
    }

    return sessions;
  } catch (err) {
    console.error("Failed to read sessions from Upstash Redis:", err);
    return [];
  }
}

export async function deleteRemoteSessions(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    await redis.del("cph_sessions");
    return true;
  } catch (err) {
    console.error("Failed to clear Upstash Redis sessions:", err);
    return false;
  }
}

export async function deleteRemoteSession(idOrKey: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis || !idOrKey) return false;

  try {
    await redis.hdel("cph_sessions", idOrKey);

    const all = await getRemoteSessions();
    const cleanKey = idOrKey.trim().toLowerCase();
    for (const s of all) {
      if (
        (s.id && s.id.toLowerCase() === cleanKey) ||
        (s.userCode && s.userCode.toLowerCase() === cleanKey) ||
        (s.sessionKey && s.sessionKey.toLowerCase() === cleanKey)
      ) {
        await redis.hdel("cph_sessions", s.id);
      }
    }
    return true;
  } catch (err) {
    console.error("Failed to delete session from Upstash Redis:", err);
    return false;
  }
}

export function getEffectiveSessionScore(s: GameSession): number {
  if (s.scoreBreakdown?.totalScore !== undefined) {
    return s.scoreBreakdown.totalScore;
  }
  const isCompleted = s.status === "completed";
  const breakdown = calculateScore({
    questionScore: s.score || 0,
    timeSpentSeconds: s.timeSpentSeconds || 0,
    completed: isCompleted,
    isTimedOut: s.status === "timed_out",
  });
  return breakdown.totalScore;
}

export function computeLeaderboardFromSessions(
  sessions: GameSession[],
  department?: string,
  shift?: string,
): LeaderboardEntry[] {
  let filtered = sessions.filter((s) => s.status === "completed" || (s.score && s.score > 0));
  if (department && department.trim()) {
    const d = department.trim().toLowerCase();
    filtered = filtered.filter((s) => (s.department || "").trim().toLowerCase() === d);
  }
  if (shift && shift.trim()) {
    const sh = shift.trim().toLowerCase();
    filtered = filtered.filter((s) => (s.shift || "").trim().toLowerCase() === sh);
  }

  filtered.sort((a, b) => {
    const scoreA = getEffectiveSessionScore(a);
    const scoreB = getEffectiveSessionScore(b);
    if (scoreB !== scoreA) return scoreB - scoreA;
    if (a.timeSpentSeconds !== b.timeSpentSeconds) return a.timeSpentSeconds - b.timeSpentSeconds;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return filtered.slice(0, 100).map((s, index) => {
    const effectiveScore = getEffectiveSessionScore(s);
    return {
      rank: index + 1,
      id: s.id,
      userCode: s.userCode || "CPH-USER",
      firstName: s.firstName || "Agent",
      lastName: s.lastName || "",
      department: s.department || "Operations",
      shift: s.shift || "Day Shift",
      score: effectiveScore,
      scoreBreakdown: s.scoreBreakdown,
      timeSpentSeconds: s.timeSpentSeconds || 0,
      currentLevel: s.currentLevel || 1,
      completed: s.status === "completed",
      hintsUsed: s.hintsUsed || 0,
      updatedAt: s.updatedAt,
    };
  });
}

export function computeStatsFromSessions(sessions: GameSession[]): EventStats {
  const totalRegistered = sessions.length;
  const completed = sessions.filter((s) => s.status === "completed");
  const totalCompleted = completed.length;

  let fastestTimeSeconds: number | null = null;
  for (const s of completed) {
    if (s.timeSpentSeconds > 0) {
      if (fastestTimeSeconds === null || s.timeSpentSeconds < fastestTimeSeconds) {
        fastestTimeSeconds = s.timeSpentSeconds;
      }
    }
  }

  const totalScore = sessions.reduce((acc, s) => acc + getEffectiveSessionScore(s), 0);
  const averageScore = totalRegistered > 0 ? Math.round(totalScore / totalRegistered) : 0;

  const deptMap = new Map<string, { totalScore: number; count: number }>();
  for (const s of sessions) {
    if (s.department && s.department.trim()) {
      const dept = s.department.trim();
      const current = deptMap.get(dept) || { totalScore: 0, count: 0 };
      current.totalScore += getEffectiveSessionScore(s);
      current.count += 1;
      deptMap.set(dept, current);
    }
  }

  let topDepartment: string | null = null;
  let highestAvg = -1;
  for (const [dept, data] of deptMap.entries()) {
    const avg = data.totalScore / data.count;
    if (avg > highestAvg) {
      highestAvg = avg;
      topDepartment = dept;
    }
  }

  return {
    totalRegistered,
    totalCompleted,
    fastestTimeSeconds,
    topDepartment,
    averageScore,
  };
}

