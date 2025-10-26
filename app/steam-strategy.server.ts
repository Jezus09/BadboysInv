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
      async () => ({
        returnURL: STEAM_CALLBACK_URL || "http://localhost/sign-in/steam/callback"
      }),
      async ({ userID }) =>
        await upsertUser(
          (await new SteamAPI(STEAM_API_KEY || "YOUR_STEAM_API_KEY").getUserSummary(
            userID
          )) as UserSummary
        )
    );
  }
}
