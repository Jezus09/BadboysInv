/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Session, createCookieSessionStorage } from "react-router";
import { SESSION_SECRET } from "./env.server";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: [SESSION_SECRET],
    // Set to false if running on HTTP without SSL
    secure: false,
    maxAge: 2147483647
  }
});

export const { getSession, commitSession, destroySession } = sessionStorage;

export function assignToSession(
  session: Session,
  keyValues: Record<string, string | undefined | null>
) {
  for (const [key, value] of Object.entries(keyValues)) {
    if (value === undefined) {
      session.unset(key);
    } else {
      session.set(key, value);
    }
  }
}
