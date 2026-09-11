import type { ObjectActionContext } from "../runtime";

export const requiresKey = (keyId: string) => (context: ObjectActionContext) =>
  context.heldItem?.keyId === keyId;

export const hasConfiguredItem = (context: ObjectActionContext) =>
  Boolean(context.heldItem?.configured);
