import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN || "";
export const bot = token ? new Telegraf(token) : null;

if (!token) {
    console.log("⚠️ TELEGRAM_BOT_TOKEN is missing in environment variables.");
}
