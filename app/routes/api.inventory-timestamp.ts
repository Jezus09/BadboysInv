import type { LoaderFunctionArgs } from "react-router";
import { getUserInventoryLastUpdateTime } from "~/models/user.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { userId } = params;
  
  if (!userId) {
    return Response.json({ error: "Missing user ID" }, { status: 400 });
  }

  try {
    const timestamp = await getUserInventoryLastUpdateTime(userId);
    return Response.json(timestamp);
  } catch (error) {
    console.error("Error getting inventory timestamp:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}