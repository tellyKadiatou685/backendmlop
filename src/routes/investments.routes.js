// src/routes/investments.routes.js
import express from 'express';
import {
  getAllInvestments,
  getInvestmentsByCategory,
  getInvestmentById,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  upload
} from '../controllers/investments.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Routes publiques
router.get('/', getAllInvestments);
router.get('/category/:category', getInvestmentsByCategory);
router.get('/:id', getInvestmentById);

// Routes protégées (nécessitent une authentification)
router.post('/', authenticateToken, upload.single('image'), createInvestment);
router.put('/:id', authenticateToken, upload.single('image'), updateInvestment);
router.delete('/:id', authenticateToken, deleteInvestment);

export default router;