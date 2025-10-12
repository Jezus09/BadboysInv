import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getUser } from "~/auth.server";
import { getUserInventoryLastUpdateTime } from "~/models/user.server";

export async function loader({ request, params }: LoaderArgs) {
  const { userId } = params;
  
  if (!userId) {
    return json({ error: "Missing user ID" }, { status: 400 });
  }

  try {
    const timestamp = await getUserInventoryLastUpdateTime(userId);
    return json(timestamp);
  } catch (error) {
    console.error("Error getting inventory timestamp:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}