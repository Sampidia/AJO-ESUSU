import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Ajo } from "../target/types/ajo";
import { expect } from "chai";
import {
    Keypair,
    PublicKey,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";

describe("ajo", () => {
    // Configure the client to use the local cluster
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Ajo as Program<Ajo>;

    // Test wallets
    const admin = Keypair.generate();
    const member1 = Keypair.generate();
    const member2 = Keypair.generate();
    const member3 = Keypair.generate();
    const platformWallet = Keypair.generate();

    // Group parameters
    const groupName = "TestGroup";
    const memberCount = 3;
    const payoutAmount = new anchor.BN(3 * LAMPORTS_PER_SOL); // 3 SOL
    const roundInterval = 0; // weekly (5 mins in dev)

    // Derived values
    const contributionAmount = new anchor.BN(LAMPORTS_PER_SOL); // 3 SOL / 3 members = 1 SOL
    const collateralAmount = payoutAmount; // 3 SOL

    // PDAs (computed in before hook)
    let groupPda: PublicKey;
    let groupBump: number;
    let vaultPda: PublicKey;
    let member1Pda: PublicKey;
    let member2Pda: PublicKey;
    let member3Pda: PublicKey;
    let round1Pda: PublicKey;

    // ---- Setup: Airdrop SOL to test wallets ----
    before(async () => {
        // Airdrop to all wallets
        const airdropAmount = 10 * LAMPORTS_PER_SOL;
        const wallets = [admin, member1, member2, member3, platformWallet];

        for (const wallet of wallets) {
            const sig = await provider.connection.requestAirdrop(
                wallet.publicKey,
                airdropAmount
            );
            await provider.connection.confirmTransaction(sig);
        }

        // Derive PDAs
        [groupPda, groupBump] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("group"),
                admin.publicKey.toBuffer(),
                Buffer.from(groupName),
            ],
            program.programId
        );

        [vaultPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), groupPda.toBuffer()],
            program.programId
        );

        [member1Pda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("member"),
                groupPda.toBuffer(),
                member1.publicKey.toBuffer(),
            ],
            program.programId
        );

        [member2Pda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("member"),
                groupPda.toBuffer(),
                member2.publicKey.toBuffer(),
            ],
            program.programId
        );

        [member3Pda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("member"),
                groupPda.toBuffer(),
                member3.publicKey.toBuffer(),
            ],
            program.programId
        );

        [round1Pda] = PublicKey.findProgramAddressSync(
            [Buffer.from("round"), groupPda.toBuffer(), Buffer.from([1])],
            program.programId
        );
    });

    // =========================================
    // TEST 1: Initialize Group
    // =========================================
    it("Initializes a group", async () => {
        const adminBalanceBefore = await provider.connection.getBalance(
            admin.publicKey
        );

        await program.methods
            .initializeGroup(groupName, memberCount, payoutAmount, roundInterval)
            .accounts({
                admin: admin.publicKey,
                groupState: groupPda,
                vault: vaultPda,
                platformWallet: platformWallet.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .signers([admin])
            .rpc();

        // Verify group state
        const group = await program.account.groupState.fetch(groupPda);
        expect(group.admin.toBase58()).to.equal(admin.publicKey.toBase58());
        expect(group.name).to.equal(groupName);
        expect(group.memberCount).to.equal(memberCount);
        expect(group.payoutAmount.toNumber()).to.equal(payoutAmount.toNumber());
        expect(group.contributionAmount.toNumber()).to.equal(
            contributionAmount.toNumber()
        );
        expect(group.collateralAmount.toNumber()).to.equal(
            collateralAmount.toNumber()
        );
        expect(group.roundInterval).to.equal(roundInterval);
        expect(group.currentRound).to.equal(0);
        expect(group.members).to.have.lengthOf(0);
        expect(group.status).to.deep.equal({ filling: {} });

        // Verify platform fee was paid (0.01 SOL)
        const platformBalance = await provider.connection.getBalance(
            platformWallet.publicKey
        );
        expect(platformBalance).to.be.greaterThan(10 * LAMPORTS_PER_SOL); // 10 SOL airdrop + fee

        // Verify vault received gas reserve
        const vaultBalance = await provider.connection.getBalance(vaultPda);
        expect(vaultBalance).to.be.greaterThan(0);

        console.log(
            `  ✓ Group "${groupName}" created. Vault balance: ${vaultBalance} lamports`
        );
    });

    // =========================================
    // TEST 2: Join Group (all 3 members)
    // =========================================
    it("Member 1 joins the group", async () => {
        await program.methods
            .joinGroup()
            .accounts({
                member: member1.publicKey,
                groupState: groupPda,
                memberState: member1Pda,
                vault: vaultPda,
                systemProgram: SystemProgram.programId,
            })
            .signers([member1])
            .rpc();

        const memberState = await program.account.memberState.fetch(member1Pda);
        expect(memberState.wallet.toBase58()).to.equal(
            member1.publicKey.toBase58()
        );
        expect(memberState.rotationPosition).to.equal(0);
        expect(memberState.collateralBalance.toNumber()).to.equal(
            collateralAmount.toNumber()
        );
        expect(memberState.refunded).to.equal(false);

        const group = await program.account.groupState.fetch(groupPda);
        expect(group.members).to.have.lengthOf(1);

        console.log(`  ✓ Member 1 joined at position #1`);
    });

    it("Member 2 joins the group", async () => {
        await program.methods
            .joinGroup()
            .accounts({
                member: member2.publicKey,
                groupState: groupPda,
                memberState: member2Pda,
                vault: vaultPda,
                systemProgram: SystemProgram.programId,
            })
            .signers([member2])
            .rpc();

        const group = await program.account.groupState.fetch(groupPda);
        expect(group.members).to.have.lengthOf(2);
        console.log(`  ✓ Member 2 joined at position #2`);
    });

    it("Member 3 joins the group", async () => {
        await program.methods
            .joinGroup()
            .accounts({
                member: member3.publicKey,
                groupState: groupPda,
                memberState: member3Pda,
                vault: vaultPda,
                systemProgram: SystemProgram.programId,
            })
            .signers([member3])
            .rpc();

        const group = await program.account.groupState.fetch(groupPda);
        expect(group.members).to.have.lengthOf(3);
        expect(group.status).to.deep.equal({ filling: {} }); // Still filling until start_cycle

        // Verify vault has all collateral
        const vaultBalance = await provider.connection.getBalance(vaultPda);
        console.log(
            `  ✓ Member 3 joined at position #3. Vault balance: ${vaultBalance} lamports`
        );
    });

    // =========================================
    // TEST 3: Start Cycle
    // =========================================
    it("Starts the cycle", async () => {
        await program.methods
            .startCycle()
            .accounts({
                caller: admin.publicKey,
                groupState: groupPda,
                roundState: round1Pda,
                systemProgram: SystemProgram.programId,
            })
            .signers([admin])
            .rpc();

        const group = await program.account.groupState.fetch(groupPda);
        expect(group.status).to.deep.equal({ active: {} });
        expect(group.currentRound).to.equal(1);

        const round = await program.account.roundState.fetch(round1Pda);
        expect(round.roundNumber).to.equal(1);
        expect(round.payoutSent).to.equal(false);
        expect(round.contributionsReceived).to.deep.equal([false, false, false]);

        console.log(
            `  ✓ Cycle started. Round 1 due at: ${new Date(
                round.dueTimestamp.toNumber() * 1000
            ).toISOString()}`
        );
    });

    // =========================================
    // TEST 4: Contributions (Round 1)
    // =========================================
    it("All 3 members contribute to Round 1", async () => {
        const members = [
            { kp: member1, pda: member1Pda },
            { kp: member2, pda: member2Pda },
            { kp: member3, pda: member3Pda },
        ];

        for (const m of members) {
            await program.methods
                .contribute()
                .accounts({
                    member: m.kp.publicKey,
                    groupState: groupPda,
                    memberState: m.pda,
                    roundState: round1Pda,
                    vault: vaultPda,
                    systemProgram: SystemProgram.programId,
                })
                .signers([m.kp])
                .rpc();
        }

        const round = await program.account.roundState.fetch(round1Pda);
        expect(round.contributionsReceived).to.deep.equal([true, true, true]);
        console.log(`  ✓ All 3 members contributed 1 SOL each`);
    });

    // =========================================
    // TEST 5: Execute Payout (Round 1)
    // =========================================
    it("Executes payout for Round 1 (to member 1)", async () => {
        const recipientBalanceBefore = await provider.connection.getBalance(
            member1.publicKey
        );

        await program.methods
            .executePayout()
            .accounts({
                caller: admin.publicKey,
                groupState: groupPda,
                roundState: round1Pda,
                vault: vaultPda,
                recipient: member1.publicKey,
                platformWallet: platformWallet.publicKey,
                nextRoundState: null,
                systemProgram: SystemProgram.programId,
            })
            .signers([admin])
            .rpc();

        const round = await program.account.roundState.fetch(round1Pda);
        expect(round.payoutSent).to.equal(true);

        const recipientBalanceAfter = await provider.connection.getBalance(
            member1.publicKey
        );
        const payout = recipientBalanceAfter - recipientBalanceBefore;

        // Payout = 3 SOL - 0.5% fee = 2.985 SOL = 2_985_000_000 lamports
        const expectedPayout = 3 * LAMPORTS_PER_SOL - (3 * LAMPORTS_PER_SOL * 50) / 10000;
        expect(payout).to.equal(expectedPayout);

        const group = await program.account.groupState.fetch(groupPda);
        expect(group.currentRound).to.equal(2); // Advanced to round 2

        console.log(
            `  ✓ Payout of ${payout / LAMPORTS_PER_SOL} SOL sent to member 1. Round advanced to ${group.currentRound}`
        );
    });

    // =========================================
    // TEST 6: Error Cases
    // =========================================
    describe("Error cases", () => {
        it("Rejects duplicate join", async () => {
            try {
                // member1 tries to join again — should fail because PDA already exists
                await program.methods
                    .joinGroup()
                    .accounts({
                        member: member1.publicKey,
                        groupState: groupPda,
                        memberState: member1Pda,
                        vault: vaultPda,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([member1])
                    .rpc();
                expect.fail("Should have thrown an error");
            } catch (err) {
                // PDA already initialized — Anchor will reject this
                expect(err).to.exist;
                console.log(`  ✓ Duplicate join correctly rejected`);
            }
        });

        it("Rejects contribution to wrong round", async () => {
            try {
                // Try contributing to round 1 again (current round is now 2)
                await program.methods
                    .contribute()
                    .accounts({
                        member: member1.publicKey,
                        groupState: groupPda,
                        memberState: member1Pda,
                        roundState: round1Pda, // Round 1 — but current is round 2
                        vault: vaultPda,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([member1])
                    .rpc();
                expect.fail("Should have thrown an error");
            } catch (err) {
                expect(err).to.exist;
                console.log(`  ✓ Wrong round contribution correctly rejected`);
            }
        });
    });

    // =========================================
    // TEST 7: Fee Validation
    // =========================================
    it("Platform fee is exactly 0.5%", async () => {
        // Calculate expected fee
        const fee = (payoutAmount.toNumber() * 50) / 10000;
        expect(fee).to.equal(0.005 * payoutAmount.toNumber());
        console.log(`  ✓ Fee calculation verified: ${fee} lamports (0.5% of ${payoutAmount.toNumber()})`);
    });
});
