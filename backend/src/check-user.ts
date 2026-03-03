import { prisma } from "./lib/prisma";

async function checkUser(memberId: string) {
    const member = await prisma.member.findUnique({
        where: { id: memberId },
        include: { user: true }
    });

    if (!member) {
        console.log("❌ Member not found");
        return;
    }

    console.log("Member Data:", JSON.stringify(member, null, 2));
    console.log("User Data:", JSON.stringify(member.user, null, 2));
}

const memberId = process.argv[2];
if (memberId) {
    checkUser(memberId);
} else {
    console.log("Please provide a memberId");
}
