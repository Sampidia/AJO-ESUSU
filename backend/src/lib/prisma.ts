import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

// Centralized Prisma Client for Prisma 6 stability
export const prisma = new PrismaClient();
