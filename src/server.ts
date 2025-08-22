// src/server.ts

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import userRoutes from './modules/users/user.route';
import academyRoutes from './modules/academies/academy.route';
import studentRoutes from './modules/students/student.route';

const app = express();

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

export default app;