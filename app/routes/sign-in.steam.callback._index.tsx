/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { redirect } from "react-router";
import { authenticator } from "~/auth.server";
import { middleware } from "~/http.server";
import { commitSession, getSession } from "~/session.server";
import type { Route } from "./+types/sign-in.steam.callback._index";

export async function loader({ request }: Route.LoaderArgs) {
  try {
    console.log("[SteamCallback] Received callback request");
    console.log("[SteamCallback] URL:", request.url);

    await middleware(request);

    console.log("[SteamCallback] Starting authentication...");
    const userId = await authenticator.authenticate("steam", request);
    console.log("[SteamCallback] Authentication successful, userId:", userId);

    const session = await getSession(request.headers.get("cookie"));
    session.set("userId", userId);

    console.log("[SteamCallback] Session created, redirecting to preferences");

    throw redirect("/api/action/preferences", {
      headers: {
        "Set-Cookie": await commitSession(session)
      }
    });
  } catch (error) {
    if (!(error instanceof Response)) {
      console.error("[SteamCallback] Authentication failed with error:", error);
      console.error("[SteamCallback] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw redirect("/?error=FailedToValidate");
    }
    throw error;
  }
}

export { ErrorBoundary as default } from "~/components/error-boundary";
