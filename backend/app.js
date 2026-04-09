import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import patientRoutes from './routes/pages/patientRoutes.js';
import filterRoutes from './routes/components/filterRoutes.js';
import statsRoutes from './routes/components/statsRoutes.js';
import predictiveRoutes from './routes/pages/predictiveRoutes.js';
import aiAnalystRoutes from './routes/components/aiAnalystRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';


const app = express();

// Middleware
app.use(helmet()); 
app.use(cors());   
app.use(express.json()); 

// 2. Register Routes
app.use('/api/patients', patientRoutes);
app.use('/api/filters', filterRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/predictive', predictiveRoutes);
app.use('/api/ai', aiAnalystRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Base route for testing
app.get('/', (req, res) => {
  res.send('TRUST Diabetes API is running...');
});

const PORT = process.env.PORT || 5000;

// Handle port already in use error
const server = app.listen(PORT, () => {
  console.log(`Server is active on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Error: Port ${PORT} is already in use!`);
    console.error('Please close any other instances of the server or use a different port.');
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});