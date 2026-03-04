import { bot } from "./bot";
import { prisma } from "../lib/prisma";

export class TelegramHelper {
    static init() {
        if (!bot) {
            console.log("⚠️ Telegram Bot Token missing, skipping initialization.");
            return;
        }

        console.log("🤖 Starting Telegram Bot...");



        bot.start((ctx) => {
            const chatId = ctx.chat.id;
            ctx.reply(
                `Welcome to Ajo Notifications! 🚀\n\nYour numeric Telegram ID is: \`${chatId}\`\n\nCopy this ID and paste it into the Ajo app settings to receive notifications.`,
                { parse_mode: "Markdown" }
            );
        });

        bot.command("link", async (ctx) => {
            const parts = ctx.message.text.split(" ");
            if (parts.length < 2) {
                return ctx.reply("Please provide your public key. Usage: /link <PUBLIC_KEY>");
            }

            const publicKey = parts[1];
            const chatId = ctx.chat.id.toString();

            try {
                // Update the User record for this public key
                const user = await prisma.user.update({
                    where: { publicKey },
                    data: { telegramId: chatId },
                    include: { memberships: true }
                });

                if (user) {
                    ctx.reply(`✅ Success! Your Telegram is now linked to ${user.memberships.length} Ajo circles.`);
                } else {
                    ctx.reply("❌ We couldn't find your account. Make sure you've joined at least one group first!");
                }
            } catch (error) {
                console.error("Telegram link error:", error);
                ctx.reply("❌ An error occurred while linking your account.");
            }
        });

        bot.command("status", async (ctx) => {
            const chatId = ctx.chat.id.toString();
            const circles = await prisma.member.findMany({
                where: { user: { telegramId: chatId } },
                include: { group: true }
            });

            if (circles.length === 0) {
                return ctx.reply("You haven't linked any Ajo circles yet. Use /link to get started.");
            }

            const list = circles.map((c: any) => `- ${c.group.name} (${c.group.status})`).join("\n");
            ctx.reply(`📊 *Your Active Circles:*\n${list}`, { parse_mode: "Markdown" });
        });

        // Use Webhooks on Vercel, Polling locally
        const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL_URL;
        const backendUrl = process.env.BACKEND_URL;

        if (isVercel && backendUrl) {
            console.log("🔗 Setting up Telegram Webhook...");
            bot.telegram.setWebhook(`${backendUrl}/api/telegram`)
                .then(() => console.log(`✅ Telegram Webhook set to ${backendUrl}/api/telegram`))
                .catch((err) => console.error("❌ Failed to set Telegram Webhook:", err));
        } else if (!isVercel) {
            const launchBot = (retryCount = 0) => {
                bot!.launch()
                    .then(() => console.log("✅ Telegram Bot is polling for updates..."))
                    .catch((err) => {
                        const isTimeout = err.code === "ETIMEDOUT" || err.message?.includes("ETIMEDOUT");
                        if (isTimeout && retryCount < 5) {
                            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
                            console.warn(`⚠️ Telegram Bot launch timed out. Retrying in ${delay / 1000}s... (Attempt ${retryCount + 1}/5)`);
                            setTimeout(() => launchBot(retryCount + 1), delay);
                        } else {
                            console.error("❌ Failed to launch Telegram Bot:", err);
                        }
                    });
            };
            launchBot();
        } else {
            console.warn("⚠️ BACKEND_URL not set, Telegram Bot will not work on Vercel.");
        }
    }
}
