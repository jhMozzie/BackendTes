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

const app = express();

// Cors Configuration
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

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

export default app;