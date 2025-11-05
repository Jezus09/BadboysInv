/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Map CS2 rarity hex colors to human-readable rarity names
 * that the CS2 plugin expects for GetRarityColor() function
 *
 * Based on @ianlucas/cs2-lib economy-container.mjs rarity colors:
 * - #ded6cc = Default/Common (Consumer Grade)
 * - #b0c3d9 = Common (Consumer/Industrial Grade)
 * - #5e98d9 = Uncommon (Industrial Grade)
 * - #4b69ff = Rare (Mil-Spec Grade)
 * - #8847ff = Mythical (Restricted)
 * - #d32ce6 = Legendary (Classified)
 * - #eb4b4b = Ancient (Covert)
 * - #e4ae39 = Immortal (Contraband/Extraordinary)
 */
export function rarityHexToName(hexColor: string | null | undefined): string {
  if (!hexColor) return "Consumer Grade";

  const normalized = hexColor.toLowerCase().trim();

  switch (normalized) {
    case "#e4ae39":
      return "Contraband"; // Gold/Yellow - Contraband (M4A4 Howl)
    case "#eb4b4b":
      return "Covert"; // Red - Ancient rarity (high-tier skins)
    case "#d32ce6":
      return "Classified"; // Pink/Magenta - Legendary rarity
    case "#8847ff":
      return "Restricted"; // Purple - Mythical rarity
    case "#4b69ff":
      return "Mil-Spec Grade"; // Blue - Rare rarity
    case "#5e98d9":
      return "Industrial Grade"; // Light Blue - Uncommon
    case "#b0c3d9":
      return "Consumer Grade"; // Light Grey - Common
    case "#ded6cc":
      return "Consumer Grade"; // Grey - Default/Common
    default:
      // Fallback for unknown colors
      return "Consumer Grade";
  }
}

/**
 * Alternative names that the plugin might recognize
 * Some items use short form names
 */
export function getRarityVariants(rarityName: string): string[] {
  switch (rarityName.toLowerCase()) {
    case "contraband":
      return ["Contraband", "Extraordinary", "Immortal"];
    case "covert":
      return ["Covert", "Ancient"];
    case "classified":
      return ["Classified", "Legendary"];
    case "restricted":
      return ["Restricted", "Mythical"];
    case "mil-spec grade":
      return ["Mil-Spec Grade", "Mil-Spec", "Rare"];
    case "industrial grade":
      return ["Industrial Grade", "Industrial", "Uncommon"];
    case "consumer grade":
      return ["Consumer Grade", "Consumer", "Common"];
    default:
      return [rarityName];
  }
}
