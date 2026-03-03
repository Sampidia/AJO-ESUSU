import dotenv from "dotenv";
import { NotificationRouter } from "./services/router";
import { NotificationType } from "@prisma/client";

dotenv.config();

async function testPipeline() {
    const memberId = process.argv[2]; // Pass a member ID from your DB

    if (!memberId) {
        console.log("❌ Error: Please provide a Member ID from your database.");
        console.log("Usage: npx ts-node src/test-notify.ts <MEMBER_ID>");
        process.exit(1);
    }

    console.log(`🚀 Starting notification test for Member: ${memberId}...`);

    try {
        await NotificationRouter.dispatch(
            memberId,
            "PAYOUT_RECEIVED" as NotificationType,
            "💰 Test Payout Received!",
            "This is a test notification from the Ajo backend. Your communication pipes are working!"
        );
        console.log("✅ Test dispatch complete. Check your Email and Telegram!");
    } catch (error) {
        console.error("❌ Test failed:", error);
    }
}

testPipeline();
