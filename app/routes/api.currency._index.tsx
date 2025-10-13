/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { requireUser } from "~/auth.server";
import {
  addCoins,
  getUserCoins,
  subtractCoins
} from "~/models/currency.server";

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const formData = await request.formData();
  const action = String(formData.get("action"));
  const amountStr = String(formData.get("amount") || "0");
  const amount = parseFloat(amountStr);

  if (isNaN(amount) || amount < 0) {
    throw new Response("Invalid amount", { status: 400 });
  }

  switch (action) {
    case "add":
      await addCoins(user.id, amount);
      break;
    case "subtract":
      await subtractCoins(user.id, amount);
      break;
    case "get":
      const coins = await getUserCoins(user.id);
      return data({ coins: coins.toFixed(2) });
    default:
      throw new Response("Invalid action", { status: 400 });
  }

  const updatedCoins = await getUserCoins(user.id);
  return data({
    success: true,
    coins: updatedCoins.toFixed(2)
  });
}
