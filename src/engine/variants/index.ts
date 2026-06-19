// Variant registry. Register a new variant here and it appears everywhere.
import { Variant } from "../variant";
import { crazyhouseVariant } from "./crazyhouse";
import { monsterKingVariant } from "./monsterKing";
import { standardVariant } from "./standard";

export const VARIANTS: Variant[] = [
  standardVariant,
  monsterKingVariant,
  crazyhouseVariant,
];

const byId = new Map(VARIANTS.map((v) => [v.id, v]));

export function getVariant(id: string): Variant {
  const v = byId.get(id);
  if (!v) throw new Error(`Unknown variant: ${id}`);
  return v;
}

export const DEFAULT_VARIANT_ID = "monster-king";
