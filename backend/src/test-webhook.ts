import axios from "axios";

async function testWebhook() {
    const url = "http://localhost:3001/api/telegram";
    const payload = {
        update_id: 123456789,
        message: {
            message_id: 1,
            from: {
                id: 12345,
                is_bot: false,
                first_name: "Test",
                username: "testuser"
            },
            chat: {
                id: 12345,
                first_name: "Test",
                type: "private"
            },
            date: Math.floor(Date.now() / 1000),
            text: "/start"
        }
    };

    console.log(`🚀 Sending test /start command to ${url}...`);

    try {
        const response = await axios.post(url, payload);
        console.log("✅ Webhook response status:", response.status);
        console.log("✅ Webhook response data:", response.data);
        console.log("\nIf the backend logged 'Welcome to Ajo Notifications', the test passed! (Note: the bot won't actually send a message to Telegram during this test unless the token is valid and chatId is correct, but the endpoint should return 200).");
    } catch (error: any) {
        console.error("❌ Webhook test failed:");
        if (error.response) {
            console.error("Response data:", error.response.data);
            console.error("Response status:", error.response.status);
        } else {
            console.error(error.message);
        }
    }
}

testWebhook();
