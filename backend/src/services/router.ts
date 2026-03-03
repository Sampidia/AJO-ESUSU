import { Resend } from "resend";
import { NotificationType, NotificationStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { bot } from "./bot";
import webpush from "web-push";


const resend = new Resend(process.env.RESEND_API_KEY);

// Web Push Configuration
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || "mailto:admin@ajo-esusu.sampidia.com",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

export class NotificationRouter {
    /**
     * Dispatch a notification to all enabled channels for a member
     */
    static async dispatch(memberId: string, type: NotificationType, title: string, message: string, roundId?: string) {
        const member = await prisma.member.findUnique({
            where: { id: memberId },
            include: { group: true, user: true }
        });

        if (!member || !member.user.notificationsEnabled) return;

        console.log(`📡 Dispatching ${type} to Member: ${member.publicKey.slice(0, 8)}... (Email: ${member.user.email || 'None'}, TG: ${member.user.telegramId || 'None'})`);

        // Create log entry in DB
        const notification = await prisma.notification.create({
            data: {
                memberId,
                userId: member.userId,
                type,
                title,
                message,
                roundId,
                status: NotificationStatus.PENDING
            }
        });

        // Check history for THIS specific notification type/member/round
        // If we find ANY "SENT" notification, it means the user has been fully notified 
        // across all enabled channels already.
        const alreadyFullySent = await prisma.notification.findFirst({
            where: {
                memberId,
                type,
                roundId,
                status: NotificationStatus.SENT
            }
        });

        if (alreadyFullySent) {
            console.log(`⏭️ Skipping dispatch for ${member.publicKey.slice(0, 8)}... - Already fully notified.`);
            return;
        }

        // We'll mark as SENT only if ALL attempted channels for this dispatch work.
        // If one fails, it stays FAILED/PENDING, and the scheduler will retry the WHOLE dispatch
        // but our send handlers (sendEmail, etc) will skip based on whether they've ever succeeded for this user/type.

        const results = await Promise.allSettled([
            member.user.email ? this.sendEmail(member, title, message) : Promise.resolve(null),
            member.user.telegramId ? this.sendTelegram(member, message) : Promise.resolve(null),
            member.user.pwaSubscription ? this.sendPush(member, title, message) : Promise.resolve(null)
        ]);

        const channels = ["Email", "Telegram", "Push"];
        let allSucceeded = true;
        let anySucceeded = false;

        results.forEach((result, index) => {
            if (result.status === "fulfilled") {
                if (result.value === true) {
                    console.log(`📡 ${channels[index]} dispatch result: ✅ SUCCESS`);
                    anySucceeded = true;
                } else if (result.value === null) {
                    // Channel not configured, doesn't count against success
                } else {
                    console.log(`📡 ${channels[index]} dispatch result: ⚠️ FAILED`);
                    allSucceeded = false;
                }
            } else {
                console.error(`❌ ${channels[index]} dispatch CRITICAL ERROR:`, result.reason);
                allSucceeded = false;
            }
        });

        await prisma.notification.update({
            where: { id: notification.id },
            data: {
                status: allSucceeded ? NotificationStatus.SENT : NotificationStatus.FAILED,
                sentAt: anySucceeded ? new Date() : null
            }
        });
    }

    private static async sendEmail(member: any, title: string, message: string): Promise<boolean | null> {
        if (!member.user.email || !process.env.RESEND_API_KEY) return null;

        try {
            const fromEmail = process.env.FROM_EMAIL || "notifications@ajo.finance";
            console.log(`📧 Sending Email to: ${member.user.email} (Type: ${title})`);

            await resend.emails.send({
                from: `Ajo Notifications <${fromEmail}>`,
                to: member.user.email,
                subject: title,
                text: message,
                html: `
                    <div style="background-color: #f9fafb; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                            <div style="background-color: #000000; padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: -0.025em; font-weight: 800;">AJO-ESUSU</h1>
                                <p style="color: #9333ea; margin: 5px 0 0 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Smart Savings Circles</p>
                            </div>
                            <div style="padding: 40px 30px;">
                                <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 20px; font-weight: 700;">${title}</h2>
                                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 32px 0; font-size: 16px;">${message}</p>
                                <a href="https://ajo-esusu.sampidia.com/group/${member.group.onChainPublicKey}" style="display: inline-block; background-color: #9333ea; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 14px; transition: background-color 0.2s;">
                                    View Circle Details
                                </a>
                            </div>
                            <div style="background-color: #f3f4f6; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0; font-size: 12px; color: #6b7280;">
                                    This is an automated notification from your Ajo-Esusu circle on Solana.<br />
                                    Secure. Transparent. Automated.
                                </p>
                            </div>
                        </div>
                    </div>`
            });
            return true;
        } catch (error: any) {
            const errStr = error.message || "";
            if (errStr.includes("fetch failed") || error.name === "TypeError" || errStr.includes("Timeout")) {
                console.log("📡 Network Issue: Email delivery skipped (transient error).");
            } else {
                console.error("Email delivery failed:", error);
            }
            return false;
        }
    }

    private static async sendTelegram(member: any, message: string): Promise<boolean | null> {
        if (!member.user.telegramId || !bot) return null;

        try {
            await bot.telegram.sendMessage(member.user.telegramId, `🔔 *Ajo-Esusu Alert*\n\n${message}`, {
                parse_mode: "Markdown"
            });
            return true;
        } catch (error: any) {
            const errStr = error.message || "";
            if (errStr.includes("fetch failed") || error.name === "TypeError" || errStr.includes("Timeout")) {
                console.log("📡 Network Issue: Telegram delivery skipped (transient error).");
            } else {
                console.error("Telegram delivery failed:", error);
            }
            return false;
        }
    }

    private static async sendPush(member: any, title: string, message: string): Promise<boolean | null> {
        if (!member.user.pwaSubscription || !process.env.VAPID_PUBLIC_KEY) return null;

        try {
            const subscription = member.user.pwaSubscription;

            await webpush.sendNotification(
                subscription,
                JSON.stringify({
                    title,
                    message,
                    icon: "/ajo_brand_logo.png",
                    badge: "/icons/badge-72x72.png", // Assuming this exists or using a fallback
                    url: `/group/${member.group.onChainPublicKey}`
                })
            );
            return true;
        } catch (error: any) {
            const errStr = error.message || "";
            if (error.statusCode === 404 || error.statusCode === 410) {
                console.log(`🧹 Cleaning up expired push subscription for user ${member.user.publicKey}`);
                await prisma.user.update({
                    where: { id: member.userId },
                    data: { pwaSubscription: null as any }
                });
            } else if (errStr.includes("fetch failed") || error.name === "TypeError" || errStr.includes("Timeout")) {
                console.log("📡 Network Issue: Push delivery skipped (transient error).");
            } else {
                console.error("Push notification failed:", error);
            }
            return false;
        }
    }
}
