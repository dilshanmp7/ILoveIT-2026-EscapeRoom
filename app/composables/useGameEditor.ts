import type {
  Floorplan,
  GameObjectRecord,
  PlayerSpawn,
  QuizQuestion,
} from "#shared/game/types";
import type { FetchError } from "ofetch";

export function useGameEditor() {
  const floorplan = ref<GameObjectRecord[]>([]);
  const playerSpawn = ref<PlayerSpawn>({ x: 0, z: 2 });
  const quizzes = ref<QuizQuestion[]>([]);
  const loading = ref(true);
  const authenticated = ref(false);
  const password = ref("");
  const authenticating = ref(false);
  const errorMessage = ref("");
  const saving = ref(false);
  const activeEditor = ref<"map" | "quiz">("map");
  const floorplanEditorKey = ref(0);

  async function loadEditorData() {
    loading.value = true;
    try {
      const [floorplanResponse, quizResponse] = await Promise.all([
        $fetch<Floorplan>("/api/game/floorplan"),
        $fetch<{ quizzes: QuizQuestion[] }>("/api/game/quizzes"),
      ]);
      floorplan.value = floorplanResponse.layout;
      playerSpawn.value = floorplanResponse.playerSpawn;
      quizzes.value = quizResponse.quizzes;
    } catch {
      errorMessage.value = "Unable to load the dispatch floorplan.";
    } finally {
      loading.value = false;
    }
  }

  async function checkAccess() {
    const response = await $fetch<{ authenticated: boolean }>(
      "/api/editor/status",
    );
    authenticated.value = response.authenticated;
    if (authenticated.value) await loadEditorData();
    else loading.value = false;
  }

  async function enterEditor() {
    if (!password.value.trim() || authenticating.value) return;
    authenticating.value = true;
    errorMessage.value = "";
    try {
      await $fetch("/api/editor/verify", {
        method: "POST",
        body: { password: password.value },
      });
      authenticated.value = true;
      password.value = "";
      await loadEditorData();
    } catch (error) {
      const fetchError = error as FetchError;
      errorMessage.value =
        fetchError.data?.statusMessage ||
        "That password did not unlock the editor.";
    } finally {
      authenticating.value = false;
    }
  }

  async function saveFloorplan(
    layout: GameObjectRecord[],
    nextPlayerSpawn: PlayerSpawn,
  ) {
    saving.value = true;
    errorMessage.value = "";
    try {
      const response = await $fetch<{ floorplan: Floorplan }>(
        "/api/game/floorplan",
        {
          method: "PUT",
          body: { layout, playerSpawn: nextPlayerSpawn },
        },
      );
      floorplan.value = response.floorplan.layout;
      playerSpawn.value = response.floorplan.playerSpawn;
      await navigateTo("/game");
    } catch (error) {
      const fetchError = error as FetchError;
      errorMessage.value =
        fetchError.data?.statusMessage ||
        "The floorplan could not be deployed.";
    } finally {
      saving.value = false;
    }
  }

  async function saveQuizzes(updatedQuizzes: QuizQuestion[]) {
    saving.value = true;
    errorMessage.value = "";
    try {
      const response = await $fetch<{ quizSet: { quizzes: QuizQuestion[] } }>(
        "/api/game/quizzes",
        {
          method: "PUT",
          body: { quizzes: updatedQuizzes },
        },
      );
      quizzes.value = response.quizSet.quizzes;
    } catch {
      errorMessage.value = "The security checks could not be deployed.";
    } finally {
      saving.value = false;
    }
  }

  const clearingSessions = ref(false);
  const resetSuccessMessage = ref("");

  async function resetFloorplan() {
    saving.value = true;
    errorMessage.value = "";
    try {
      const response = await $fetch<{ floorplan: Floorplan }>(
        "/api/game/floorplan/reset",
        { method: "POST" },
      );
      floorplan.value = response.floorplan.layout;
      playerSpawn.value = response.floorplan.playerSpawn;
      floorplanEditorKey.value += 1;
    } catch {
      errorMessage.value = "The default floorplan could not be restored.";
    } finally {
      saving.value = false;
    }
  }

  async function resetAllGameSessions() {
    if (!confirm("⚠️ DANGER: Are you sure you want to RESET ALL game sessions and clear the leaderboard?\n\nThis will permanently delete all player scores, registrations, and completion records for the event. This action cannot be undone.")) {
      return false;
    }
    clearingSessions.value = true;
    errorMessage.value = "";
    resetSuccessMessage.value = "";
    try {
      const result = await $fetch<{ success: boolean; deletedSessions: number; deletedTokens: number }>("/api/editor/reset-sessions", {
        method: "POST",
      });
      resetSuccessMessage.value = `✅ Successfully wiped ${result.deletedSessions} game session(s) & reset the Leaderboard!`;
      return true;
    } catch (error) {
      const fetchError = error as FetchError;
      errorMessage.value = fetchError.data?.statusMessage || "Failed to reset game sessions.";
      return false;
    } finally {
      clearingSessions.value = false;
    }
  }

  return {
    floorplan,
    playerSpawn,
    quizzes,
    loading,
    authenticated,
    password,
    authenticating,
    errorMessage,
    saving,
    activeEditor,
    floorplanEditorKey,
    clearingSessions,
    resetSuccessMessage,
    checkAccess,
    enterEditor,
    saveFloorplan,
    saveQuizzes,
    resetFloorplan,
    resetAllGameSessions,
  };
}
