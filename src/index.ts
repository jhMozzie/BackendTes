// src/index.ts

import dotenv from 'dotenv';
import { PrismaClient } from './generated/prisma';
import app from './server';

dotenv.config();

const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$connect();
        console.log('✅ Connected to database'); // Mensaje de éxito
        app.listen(PORT, () => {
            console.log(`🚀 Server listening on http://localhost:${PORT}`);
        });
    } catch (e) {
        console.error('❌ Database connection failed', e); // Mensaje de error
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();