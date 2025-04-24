// src/routes/administrativeProcedures.routes.js
import express from 'express';
import {
  getAllProcedures,
  getProceduresByCategory,
  getProcedureById,
  createProcedure,
  updateProcedure,
  deleteProcedure
} from '../controllers/administrativeProcedures.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Routes publiques - accessibles sans authentification
router.get('/', getAllProcedures);
router.get('/category/:category', getProceduresByCategory);
router.get('/:id', getProcedureById);

// Routes protégées - nécessitent une authentification
router.post('/', authenticateToken, createProcedure);
router.put('/:id', authenticateToken, updateProcedure);
router.delete('/:id', authenticateToken, deleteProcedure);

export default router;