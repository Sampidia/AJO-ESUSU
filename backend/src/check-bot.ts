
import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN || "";

if (!token) {
    console.error("❌ TELEGRAM_BOT_TOKEN is missing!");
    process.exit(1);
}

const bot = new Telegraf(token);

async function checkBot() {
    try {
        console.log("🔍 Checking bot info...");
        const botInfo = await bot.telegram.getMe();
        console.log("✅ Bot is valid!");
        console.log(`🤖 Name: ${botInfo.first_name}`);
        console.log(`👤 Username: @${botInfo.username}`);
        process.exit(0);
    } catch (error: any) {
        console.error("❌ Failed to fetch bot info:");
        console.error(error.message);
        process.exit(1);
    }
}

checkBot();
