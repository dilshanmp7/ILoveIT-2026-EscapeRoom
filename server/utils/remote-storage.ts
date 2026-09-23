import type { EventStats, GameSession, LeaderboardEntry } from "#shared/game/types";

function getKvConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

export function isRemoteStorageConfigured(): boolean {
  return Boolean(getKvConfig());
}

export async function saveRemoteSession(session: GameSession): Promise<boolean> {
  const config = getKvConfig();
  if (!config) return false;

  try {
    const res = await fetch(`${config.url}/hset/cph_sessions/${encodeURIComponent(session.id)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(session),
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to save session to remote KV:", err);
    return false;
  }
}

export async function getRemoteSessions(): Promise<GameSession[]> {
  const config = getKvConfig();
  if (!config) return [];

  try {
    const res = await fetch(`${config.url}/hgetall/cph_sessions`, {
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { result?: Record<string, string | object> | string[] };
    if (!data.result) return [];

    const sessions: GameSession[] = [];

    if (Array.isArray(data.result)) {
      for (let i = 1; i < data.result.length; i += 2) {
        try {
          const item = typeof data.result[i] === "string" ? JSON.parse(data.result[i] as string) : data.result[i];
          if (item && item.id) sessions.push(item as GameSession);
        } catch {
          // Ignore parse errors
        }
      }
    } else if (typeof data.result === "object") {
      for (const val of Object.values(data.result)) {
        try {
          const item = typeof val === "string" ? JSON.parse(val as string) : val;
          if (item && item.id) sessions.push(item as GameSession);
        } catch {
          // Ignore parse errors
        }
      }
    }

    return sessions;
  } catch (err) {
    console.error("Failed to read sessions from remote KV:", err);
    return [];
  }
}

export async function deleteRemoteSessions(): Promise<boolean> {
  const config = getKvConfig();
  if (!config) return false;

  try {
    const res = await fetch(`${config.url}/del/cph_sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to clear remote KV sessions:", err);
    return false;
  }
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
    if (b.score !== a.score) return b.score - a.score;
    if (a.timeSpentSeconds !== b.timeSpentSeconds) return a.timeSpentSeconds - b.timeSpentSeconds;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return filtered.slice(0, 100).map((s, index) => ({
    rank: index + 1,
    id: s.id,
    userCode: s.userCode || "CPH-USER",
    firstName: s.firstName || "Agent",
    lastName: s.lastName || "",
    department: s.department || "Operations",
    shift: s.shift || "Day Shift",
    score: s.score || 0,
    timeSpentSeconds: s.timeSpentSeconds || 0,
    currentLevel: s.currentLevel || 1,
    completed: s.status === "completed",
    hintsUsed: s.hintsUsed || 0,
    updatedAt: s.updatedAt,
  }));
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

  const totalScore = sessions.reduce((acc, s) => acc + (s.score || 0), 0);
  const averageScore = totalRegistered > 0 ? Math.round(totalScore / totalRegistered) : 0;

  const deptMap = new Map<string, { totalScore: number; count: number }>();
  for (const s of sessions) {
    if (s.department && s.department.trim()) {
      const dept = s.department.trim();
      const current = deptMap.get(dept) || { totalScore: 0, count: 0 };
      current.totalScore += s.score || 0;
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
