import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { yieldRouter } from './routes/yield';
import { portfolioRouter } from './routes/portfolio';
import { riskRouter } from './routes/risk';
import { decisionRouter } from './routes/decision';
import { ftsoService } from './services/ftso';
import { fdcService } from './services/fdc';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/yield', yieldRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/risk', riskRouter);
app.use('/api/decision', decisionRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(`FLINT Backend server running on port ${PORT}`);
  
  // Initialize services
  ftsoService.start();
  fdcService.start();
});

export default app;

