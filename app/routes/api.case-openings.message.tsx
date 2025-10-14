/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data } from "react-router";
import { z } from "zod";
import { api } from "~/api.server";
import { getRequestUserId } from "~/auth.server";
import { middleware } from "~/http.server";
import { methodNotAllowed } from "~/responses.server";
import { prisma } from "~/db.server";
import type { Route } from "./+types/api.case-openings.message";

export const ApiCaseOpeningMessageUrl = "/api/case-openings/message";

/**
 * Handle case opening message API requests
 */
export const action = api(async ({ request }: Route.ActionArgs) => {
  await middleware(request);

  if (request.method !== "POST") {
    throw methodNotAllowed;
  }

  const userId = await getRequestUserId(request);
  if (!userId) {
    return data({ success: false, message: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { caseOpeningId, message, replyToId } = z
    .object({
      caseOpeningId: z.string(),
      message: z.string().min(1).max(500),
      replyToId: z.string().optional()
    })
    .parse(body);

  try {
    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatar: true
      }
    });

    if (!user) {
      return data({ success: false, message: "User not found" }, { status: 404 });
    }

    // Verify case opening exists
    const caseOpening = await prisma.caseOpening.findUnique({
      where: { id: caseOpeningId }
    });

    if (!caseOpening) {
      return data({ success: false, message: "Case opening not found" }, { status: 404 });
    }

    // Create the message
    const newMessage = await prisma.caseOpeningMessage.create({
      data: {
        caseOpeningId,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        message,
        replyToId: replyToId || null
      },
      include: {
        replyTo: {
          select: {
            id: true,
            userName: true,
            message: true
          }
        }
      }
    });

    return data({
      success: true,
      message: newMessage
    });
  } catch (error: any) {
    console.error("Case opening message API error:", error);
    return data(
      {
        success: false,
        message: error.message || "Internal server error"
      },
      { status: 500 }
    );
  }
});

/**
 * Get messages for case openings
 */
export const loader = api(async ({ request }: Route.LoaderArgs) => {
  await middleware(request);

  const url = new URL(request.url);
  const caseOpeningId = url.searchParams.get("caseOpeningId");

  if (!caseOpeningId) {
    return data({ success: false, message: "Case opening ID required" }, { status: 400 });
  }

  try {
    const messages = await prisma.caseOpeningMessage.findMany({
      where: { caseOpeningId },
      include: {
        replyTo: {
          select: {
            id: true,
            userName: true,
            message: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return data({
      success: true,
      messages
    });
  } catch (error: any) {
    console.error("Case opening message fetch error:", error);
    return data(
      {
        success: false,
        message: error.message || "Internal server error"
      },
      { status: 500 }
    );
  }
});
