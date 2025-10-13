import { data } from "react-router";
import { z } from "zod";
import { getRequestUserId } from "~/auth.server";
import { prisma } from "~/db.server";
import { findUniqueUser } from "~/models/user.server";

const getCaseOpeningsSchema = z.object({
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0)
});

export async function loader({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const params = getCaseOpeningsSchema.parse(
      Object.fromEntries(url.searchParams.entries())
    );

    const caseOpenings = await prisma.caseOpening.findMany({
      take: params.limit,
      skip: params.offset,
      orderBy: {
        createdAt: "desc"
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    return data({
      success: true,
      data: caseOpenings
    });
  } catch (error) {
    console.error("Error fetching case openings:", error);
    return data(
      {
        success: false,
        error: "Failed to fetch case openings"
      },
      { status: 500 }
    );
  }
}

const createCaseOpeningSchema = z.object({
  caseItemId: z.number(),
  caseName: z.string(),
  keyItemId: z.number().optional(),
  keyName: z.string().optional(),
  unlockedItemId: z.number(),
  unlockedName: z.string(),
  unlockedRarity: z.string()
});

export async function action({ request }: { request: Request }) {
  try {
    if (request.method !== "POST") {
      return data(
        { success: false, error: "Method not allowed" },
        { status: 405 }
      );
    }

    const userId = await getRequestUserId(request);
    if (!userId) {
      return data({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await findUniqueUser(userId);
    if (!user) {
      return data({ success: false, error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const data_ = createCaseOpeningSchema.parse(body);

    const caseOpening = await prisma.caseOpening.create({
      data: {
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        caseItemId: data_.caseItemId,
        caseName: data_.caseName,
        keyItemId: data_.keyItemId,
        keyName: data_.keyName,
        unlockedItemId: data_.unlockedItemId,
        unlockedName: data_.unlockedName,
        unlockedRarity: data_.unlockedRarity
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    return data({
      success: true,
      data: caseOpening
    });
  } catch (error) {
    console.error("Error creating case opening:", error);
    return data(
      {
        success: false,
        error: "Failed to save case opening"
      },
      { status: 500 }
    );
  }
}
