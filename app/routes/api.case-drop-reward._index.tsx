/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from "zod";
import { api } from "~/api.server";
import { middleware } from "~/http.server";
import { findUniqueUser, manipulateUserInventory } from "~/models/user.server";
import { badRequest, methodNotAllowed, unauthorized } from "~/responses.server";
import type { Route } from "./+types/api.case-drop-reward._index";

// API Key for security
const CASE_DROP_API_KEY = "badboys_secure_api_key_2025";

// Mystery Case will use Community Case 33 as the container ID
// This case will be detected in unlock logic to give random other cases
const MYSTERY_CASE_ID = 4899; // Community Case 33

export const action = api(async ({ request }: Route.ActionArgs) => {
  await middleware(request);

  if (request.method !== "POST") {
    throw methodNotAllowed;
  }

  const { apiKey, userId, caseType } = z
    .object({
      apiKey: z.string(),
      userId: z.string(),
      caseType: z.string()
    })
    .parse(await request.json());

  // Verify API key
  if (apiKey !== CASE_DROP_API_KEY) {
    console.error(`[CaseDrop] Invalid API key attempt from userId: ${userId}`);
    throw unauthorized;
  }

  // Only support mystery_case for now
  if (caseType !== "mystery_case") {
    return Response.json({
      success: false,
      error: `Unsupported case type: ${caseType}`
    });
  }

  try {
    console.log(`[CaseDrop] Adding Mystery Case to user ${userId}`);

    // Find user
    const { inventory: rawInventory } = await findUniqueUser(userId);

    // Add Mystery Case to inventory
    await manipulateUserInventory({
      rawInventory,
      userId,
      manipulate(inventory) {
        inventory.add({
          id: MYSTERY_CASE_ID
        });
      }
    });

    console.log(`[CaseDrop] Successfully added Mystery Case to user ${userId}`);

    return Response.json({
      success: true,
      message: "Mystery Case added to inventory"
    });
  } catch (error: any) {
    console.error("[CaseDrop] Error adding case:", error);
    return Response.json({
      success: false,
      error: error.message || "Failed to add case to inventory"
    });
  }
});

export { loader } from "./api.$";
