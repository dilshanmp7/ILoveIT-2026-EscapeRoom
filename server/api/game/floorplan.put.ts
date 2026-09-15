import type { Floorplan, GameObjectInstance } from "#shared/game/types";
import { createError, getCookie, readBody } from "h3";
import { isEditorAuthorized } from "../../utils/editor-access";
import { writeFloorplan } from "../../utils/game-database";
import { ACCESS_COOKIE, isAccessTokenValid } from "../../utils/game-session";

function isGameObjectInstance(value: unknown): value is GameObjectInstance {
  if (!value || typeof value !== "object") return false;
  const asset = value as Partial<GameObjectInstance>;
  return (
    typeof asset.id === "string" &&
    typeof asset.position?.x === "number" &&
    typeof asset.position.z === "number" &&
    typeof asset.position.rotation === "number" &&
    typeof asset.w === "number" &&
    typeof asset.d === "number" &&
    typeof asset.type === "string" &&
    typeof asset.label === "string"
  );
}

export default defineEventHandler(async (event) => {
  if (
    !isAccessTokenValid(getCookie(event, ACCESS_COOKIE)) &&
    !isEditorAuthorized(event)
  ) {
    throw createError({
      statusCode: 401,
      statusMessage: "Game access required",
    });
  }

  const body = await readBody<{ layout?: unknown; playerSpawn?: unknown }>(
    event,
  );
  const playerSpawn = body?.playerSpawn as
    | { x?: unknown; z?: unknown }
    | undefined;
  if (
    !Array.isArray(body?.layout) ||
    body.layout.length > 100 ||
    !body.layout.every(isGameObjectInstance) ||
    typeof playerSpawn?.x !== "number" ||
    typeof playerSpawn.z !== "number" ||
    Math.abs(playerSpawn.x) > 10 ||
    Math.abs(playerSpawn.z) > 8
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid floorplan layout is required",
    });
  }

  return {
    floorplan: writeFloorplan({
      layout: body.layout,
      playerSpawn,
    } as Floorplan),
  };
});
