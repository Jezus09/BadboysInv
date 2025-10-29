/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data } from "react-router";
import { middleware } from "~/http.server";
import { prisma } from "~/db.server";
import type { Route } from "./+types/api.players.search._index";

export async function loader({ request }: Route.LoaderArgs) {
  await middleware(request);

  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";

  if (query.length < 2) {
    return data({ players: [] });
  }

  const players = await prisma.user.findMany({
    where: {
      name: {
        contains: query,
        mode: "insensitive"
      }
    },
    select: {
      id: true,
      name: true,
      avatar: true
    },
    take: 10
  });

  return data({ players });
}
