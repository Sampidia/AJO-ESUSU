import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "./ajo.json";
import { Ajo } from "./types/ajo";

export const PROGRAM_ID = new PublicKey("CR6pmRS8pcrc2grm2Hiq8Ny9fhvRV7mx6dYN5Bbs829X");

export function getProgram(connection: Connection, wallet: any) {
    const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
    });
    return new Program(idl as Idl, provider) as unknown as Program<Ajo>;
}

export const getGroupAddress = (admin: PublicKey, name: string) => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("group"), admin.toBuffer(), Buffer.from(name)],
        PROGRAM_ID
    )[0];
};

export const getMemberAddress = (group: PublicKey, member: PublicKey) => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("member"), group.toBuffer(), member.toBuffer()],
        PROGRAM_ID
    )[0];
};

export const getVaultAddress = (group: PublicKey) => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), group.toBuffer()],
        PROGRAM_ID
    )[0];
};

export const getRoundAddress = (group: PublicKey, roundNumber: number) => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("round"), group.toBuffer(), Buffer.from([roundNumber])],
        PROGRAM_ID
    )[0];
};
