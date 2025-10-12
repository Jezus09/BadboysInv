import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getUserInventoryLastUpdateTime, updateUserInventoryTimestamp } from "~/models/user.server";

export async function loader({ params }: LoaderArgs) {
  const { userId } = params;
  
  if (!userId) {
    return json({ error: "Missing user ID" }, { status: 400 });
  }

  try {
    const timestamp = await getUserInventoryLastUpdateTime(userId);
    return json(Number(timestamp));
  } catch (error) {
    console.error("Error getting inventory timestamp:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function action({ request, params }: ActionArgs) {
  const { userId } = params;
  
  if (!userId) {
    return json({ error: "Missing user ID" }, { status: 400 });
  }

  try {
    await updateUserInventoryTimestamp(userId);
    return json({ success: true });
  } catch (error) {
    console.error("Error updating inventory timestamp:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}