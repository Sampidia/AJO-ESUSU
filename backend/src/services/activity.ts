import { prisma } from "../lib/prisma";

export type ActivityType =
    | "JOIN"
    | "LEAVE"
    | "CONTRIBUTION"
    | "PAYOUT_EXECUTED"
    | "CYCLE_STARTED"
    | "GROUP_CREATED"
    | "GROUP_ALERT"
    | "AUTO_PULL";

export class ActivityService {
    /**
     * Log a new activity in the database.
     */
    static async log({
        groupId,
        userId,
        type,
        message,
        metadata
    }: {
        groupId: string;
        userId?: string;
        type: ActivityType;
        message: string;
        metadata?: any;
    }) {
        try {
            return await prisma.activity.create({
                data: {
                    groupId,
                    userId,
                    type,
                    message,
                    metadata: metadata ? (metadata as any) : undefined
                }
            });
        } catch (error) {
            console.error("Failed to log activity:", error);
        }
    }

    /**
     * Fetch recent activity for a specific group.
     */
    static async getGroupActivity(groupId: string, limit: number = 20) {
        return await prisma.activity.findMany({
            where: { groupId },
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
                user: {
                    select: {
                        publicKey: true,
                        handle: true,
                        avatarUrl: true
                    }
                }
            }
        });
    }
}
