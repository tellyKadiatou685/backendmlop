// src/routes/investments.routes.js
import express from 'express';
import {
  getAllInvestments,
  getInvestmentsByCategory,
  getInvestmentById,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  handleImageUpload
} from '../controllers/investments.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Routes publiques - accessibles sans authentification
router.get('/', getAllInvestments);
router.get('/category/:category', getInvestmentsByCategory);
router.get('/:id', getInvestmentById);

// Routes protégées - nécessitent une authentification
router.post('/', authenticateToken, handleImageUpload, createInvestment);
router.put('/:id', authenticateToken, handleImageUpload, updateInvestment);
router.delete('/:id', authenticateToken, deleteInvestment);

export default router;