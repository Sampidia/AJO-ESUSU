import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { SolanaListener } from "./services/listener";
import { SchedulerService } from "./services/scheduler";
import { TelegramHelper } from "./services/telegram";
import { bot } from "./services/bot";
import { prisma } from "./lib/prisma";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());

// Initialize Services
const listener = new SolanaListener();
const scheduler = new SchedulerService();

// --- GLOBAL ERROR HANDLERS ---
// Prevent transient network errors from crashing the backend process
process.on("unhandledRejection", (reason, promise) => {
    const errStr = String(reason);
    if (errStr.includes("fetch failed") || errStr.includes("TypeError") || errStr.includes("Timeout")) {
        console.log("📡 Global Network Issue (Promise): Suppressing transient RPC/Fetch failure.");
    } else {
        console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
    }
});

process.on("uncaughtException", (error) => {
    const errStr = error.message || error.toString() || "";
    if (errStr.includes("fetch failed") || error.name === "TypeError" || errStr.includes("Timeout")) {
        console.log("📡 Global Network Issue (Exception): Suppressing transient RPC/Fetch failure.");
    } else {
        console.error("❌ Uncaught Exception:", error);
    }
});

// --- REST API ENDPOINTS ---

// Health Check
app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok", service: "ajo-backend", time: new Date() });
});

app.get("/", (req: Request, res: Response) => {
    res.json({ message: "Ajo Backend is running", documentation: "/health" });
});

// Register or Update Member Preferences
app.post("/api/register", async (req: Request, res: Response) => {
    const { publicKey, groupId, email, telegramId, rotationPosition } = req.body;

    if (!publicKey || !groupId) {
        return res.status(400).json({ error: "publicKey and groupId are required" });
    }

    try {
        // Resolve Group from Public Key (since frontend sends Solana PK)
        let group = null;
        let attempts = 0;

        while (!group && attempts < 3) {
            group = await prisma.group.findUnique({
                where: { onChainPublicKey: groupId }
            });

            // Fallback for cases where groupId might already be internal ID (rare)
            if (!group && groupId.length === 24) {
                group = await prisma.group.findUnique({ where: { id: groupId } });
            }

            if (!group) {
                attempts++;
                if (attempts < 3) {
                    console.log(`⏳ Group ${groupId} not found yet, retrying registration in 2s...`);
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        }

        if (!group) {
            console.error(`Group not found for ID: ${groupId}`);
            return res.status(404).json({ error: "Group not found in database. Please wait a moment and try again." });
        }

        // 1. Find or create the global User record
        const user = await prisma.user.upsert({
            where: { publicKey },
            update: { email, telegramId },
            create: { publicKey, email, telegramId }
        });

        // 2. Upsert the Member record tied to this user and group
        const member = await prisma.member.upsert({
            where: {
                publicKey_groupId: { publicKey, groupId: group.id }
            },
            update: {
                rotationPosition: rotationPosition !== undefined ? Number(rotationPosition) : undefined,
            },
            create: {
                publicKey,
                userId: user.id,
                groupId: group.id,
                rotationPosition: rotationPosition !== undefined ? Number(rotationPosition) : 0
            },
            include: { group: true, user: true }
        });

        res.json({ success: true, member });
    } catch (error: any) {
        console.error("Registration error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Fetch Notifications for a Member
app.get("/api/notifications/:publicKey", async (req: Request, res: Response) => {
    const { publicKey } = req.params as any;

    try {
        const notifications = await prisma.notification.findMany({
            where: {
                memberId: { not: null },
                member: { is: { publicKey: publicKey as string } }
            },
            orderBy: { createdAt: "desc" },
            take: 20
        });

        res.json({ success: true, notifications });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle Notifications
app.patch("/api/preferences/:id", async (req: Request, res: Response) => {
    const { id } = req.params as any;
    const { enabled } = req.body;

    try {
        await prisma.member.update({
            where: { id },
            data: {
                user: {
                    update: { notificationsEnabled: enabled }
                }
            }
        });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// User Profile Management
app.get("/api/user/:publicKey", async (req: Request, res: Response) => {
    const { publicKey } = req.params as any;
    try {
        const user = await prisma.user.findUnique({
            where: { publicKey: publicKey as string }
        });
        res.json({ success: true, user });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.patch("/api/user/:publicKey", async (req: Request, res: Response) => {
    const { publicKey } = req.params as any;
    const { email, telegramId, handle, avatarUrl } = req.body;
    try {
        // Uniqueness check for handle if provided
        if (handle) {
            const existing = await prisma.user.findFirst({
                where: {
                    handle: handle as string,
                    publicKey: { not: publicKey as string }
                }
            });
            if (existing) {
                return res.status(400).json({ error: "Handle already taken" });
            }
        }

        const user = await prisma.user.upsert({
            where: { publicKey: publicKey as string },
            update: {
                email: email as string,
                telegramId: telegramId as string,
                handle: handle as string,
                avatarUrl: avatarUrl as string
            },
            create: {
                publicKey: publicKey as string,
                email: email as string,
                telegramId: telegramId as string,
                handle: handle as string,
                avatarUrl: avatarUrl as string
            }
        });
        res.json({ success: true, user });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch Group Activities
app.get("/api/group/:groupId/activities", async (req: Request, res: Response) => {
    const { groupId } = req.params as any;
    try {
        // Resolve Group from Public Key if needed
        let internalGroupId = groupId;
        if (groupId.length !== 24) {
            const group = await prisma.group.findUnique({
                where: { onChainPublicKey: groupId as string }
            });
            if (group) internalGroupId = group.id;
        }

        const activities = await prisma.activity.findMany({
            where: { groupId: internalGroupId as string },
            orderBy: { createdAt: "desc" },
            take: 30,
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

        const response = {
            success: true,
            activities: activities.map(a => ({
                ...a,
                user: a.user ? {
                    handle: a.user.handle,
                    publicKey: a.user.publicKey,
                    avatarUrl: a.user.avatarUrl
                } : null
            }))
        };
        res.json(response);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Export Savings Statement (CSV)
app.get("/api/reports/statement/:publicKey", async (req: Request, res: Response) => {
    const { publicKey } = req.params as any;

    try {
        const user = await prisma.user.findUnique({
            where: { publicKey: publicKey as string },
            include: {
                activities: {
                    where: {
                        type: { in: ["CONTRIBUTION", "PAYOUT_EXECUTED"] }
                    },
                    include: {
                        group: true
                    },
                    orderBy: { createdAt: "desc" }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Generate CSV content
        const headers = ["Date", "Group", "Type", "Message", "Amount (SOL)", "Round"];
        const rows = user.activities.map(a => {
            const metadata = a.metadata as any;
            const amount = metadata?.amount ? (Number(metadata.amount) / 1e9).toFixed(4) : "0";
            return [
                a.createdAt.toISOString(),
                a.group.name,
                a.type,
                a.message,
                amount,
                metadata?.roundNum || "N/A"
            ].join(",");
        });

        const csv = [headers.join(","), ...rows].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=esusu_statement_${publicKey}.csv`);
        res.status(200).send(csv);

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// User Performance Stats (for charts)
app.get("/api/stats/user/:publicKey", async (req: Request, res: Response) => {
    const { publicKey } = req.params as any;

    try {
        const activities = await prisma.activity.findMany({
            where: {
                user: { publicKey: publicKey as string },
                type: { in: ["CONTRIBUTION", "PAYOUT_EXECUTED"] }
            },
            orderBy: { createdAt: "asc" }
        });

        // Aggregate SOL saved over time
        let totalSaved = 0;
        const chartData = activities.map(a => {
            const metadata = a.metadata as any;
            const amount = Number(metadata?.amount || 0) / 1e9;
            if (a.type === "CONTRIBUTION") {
                totalSaved += amount;
            }
            return {
                date: a.createdAt.toISOString().split('T')[0],
                saved: totalSaved,
                amount: amount,
                type: a.type
            };
        });

        res.json({ success: true, chartData });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Global Ecosystem Stats
app.get("/api/stats/global", async (req: Request, res: Response) => {
    try {
        const groups = await prisma.group.findMany({
            where: { status: { in: ["filling", "active"] } },
            include: { members: true }
        });

        const totalValueLocked = groups.reduce((acc, g) => {
            const contrib = Number(g.contributionAmount) / 1e9;
            return acc + (contrib * g.members.length); // Simplified TVL
        }, 0);

        const totalCircles = await prisma.group.count();
        const totalUsers = await prisma.user.count();

        res.json({
            success: true,
            tvl: totalValueLocked,
            circles: totalCircles,
            users: totalUsers
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Browser Push Subscription
app.post("/api/push/subscribe", async (req: Request, res: Response) => {
    const { publicKey, subscription } = req.body;

    if (!publicKey || !subscription) {
        return res.status(400).json({ error: "publicKey and subscription are required" });
    }

    try {
        await prisma.user.update({
            where: { publicKey },
            data: { pwaSubscription: subscription }
        });
        res.json({ success: true });
    } catch (error: any) {
        console.error("Push subscription error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Telegram Webhook Endpoint
app.post("/api/telegram", async (req: Request, res: Response) => {
    if (!bot) {
        return res.status(500).json({ error: "Bot not initialized" });
    }
    try {
        await bot.handleUpdate(req.body, res);
    } catch (error: any) {
        console.error("Telegram webhook error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Cron Job Endpoints (Secured via CRON_SECRET)
app.get("/api/cron/:task", async (req: Request, res: Response) => {
    const { task } = req.params as any;
    const { secret } = req.query;

    const CRON_SECRET = process.env.CRON_SECRET;

    if (!CRON_SECRET || (secret as string) !== CRON_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        if (task === "automation") {
            console.log("🤖 External Trigger: Running Automation...");
            await scheduler.runAutomation();
            return res.json({ success: true, message: "Automation executed" });
        } else if (task === "reminders") {
            console.log("⏰ External Trigger: Running Reminders...");
            await scheduler.checkReminders();
            return res.json({ success: true, message: "Reminders checked" });
        } else {
            return res.status(400).json({ error: "Invalid task" });
        }
    } catch (error: any) {
        console.error(`Cron task ${task} failed:`, error);
        res.status(500).json({ error: error.message });
    }
});

// Export app for Serverless
export default app;

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`🚀 Ajo Backend running on port ${port}`);

        // Start Async Services (Only in persistent environments)
        listener.start();
        scheduler.start();
        TelegramHelper.init();
    });
} else {
    // On Vercel, we still need to init some things if they are stateless
    // but avoid long-running loops or listeners that block the function.
    TelegramHelper.init();
}
