/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SteamStrategy as BaseSteamStrategy } from "@ianlucas/remix-auth-steam";
import SteamAPI, { type UserSummary } from "steamapi";
import { STEAM_API_KEY, STEAM_CALLBACK_URL } from "./env.server";
import { upsertUser } from "./models/user.server";

export class SteamStrategy extends BaseSteamStrategy<string> {
  constructor() {
    super(
      async () => {
        console.log("[SteamAuth] Callback URL:", STEAM_CALLBACK_URL);
        return {
          returnURL: STEAM_CALLBACK_URL || "http://localhost/sign-in/steam/callback"
        };
      },
      async ({ userID }) => {
        try {
          console.log("[SteamAuth] Authenticating user ID:", userID);
          console.log("[SteamAuth] Steam API Key configured:", STEAM_API_KEY ? "Yes" : "No");
          console.log("[SteamAuth] Steam API Key length:", STEAM_API_KEY?.length || 0);
          console.log("[SteamAuth] Steam API Key first 8 chars:", STEAM_API_KEY?.substring(0, 8) || "MISSING");

          if (!STEAM_API_KEY || STEAM_API_KEY === "YOUR_STEAM_API_KEY") {
            throw new Error("STEAM_API_KEY environment variable is not set or invalid");
          }

          const steamAPI = new SteamAPI(STEAM_API_KEY);
          const userSummary = await steamAPI.getUserSummary(userID);

          console.log("[SteamAuth] Steam user summary received:", userSummary.nickname);

          const userId = await upsertUser(userSummary as UserSummary);

          console.log("[SteamAuth] User upserted successfully, userId:", userId);

          return userId;
        } catch (error) {
          console.error("[SteamAuth] Authentication failed:", error);
          throw error;
        }
      }
    );
  }
}
