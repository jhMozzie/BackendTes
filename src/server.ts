// src/server.ts

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import userRoutes from './modules/users/user.route';
import academyRoutes from './modules/academies/academy.route';
import studentRoutes from './modules/students/student.route';
import championshipRoutes from './modules/championships/championship.route';
import participantRoutes from './modules/participants/participant.route';
import championshipCategoryRoutes from './modules/championships-categories/championship-categories.routes';
import roleRoutes from './modules/roles/role.route';
import beltRoutes from './modules/belts/belt.route';
import authRoutes from './modules/auth/auth.route';
import phaseRoutes from './modules/phases/phase.route';
import matchRoutes from './modules/matches/match.route';
import academyChampionshipRoutes from './modules/academies-championships/academy-championships.routes';
import aiQueryRoutes from './modules/ai-query/ai-query.route';

const app = express();

// Cors Configuration
// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ✅ Configuración dinámica de CORS
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost',
    ...((process.env.CORS_ORIGIN || '').split(',').map(o => o.trim())),
].filter(Boolean);

const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Permitir peticiones sin origin (Postman, curl, same-origin requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);

        // Log and gracefully deny CORS without throwing an error (avoid 500 responses on preflight)
        console.warn(`❌ Origin not allowed by CORS: ${origin}`);
        return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
};

app.use(cors(corsOptions));

// Ensure preflight requests are handled explicitly
app.options('*', cors(corsOptions));

// Log allowed origins for easier debugging in deployments
console.info('CORS allowed origins:', allowedOrigins);

// Health check
app.get('/', (_req, res) => {
    res.send('API is running ✅');
});

// Rutas
app.use('/api/users', userRoutes);
app.use('/api/academies', academyRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/championships', championshipRoutes);
app.use('/api', championshipCategoryRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/belts', beltRoutes);
app.use('/api/phases', phaseRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/academy-championships', academyChampionshipRoutes);
app.use('/api/ai-query', aiQueryRoutes);

export default app;