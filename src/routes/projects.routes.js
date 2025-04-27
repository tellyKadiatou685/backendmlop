// src/routes/projects.routes.js
import express from 'express';
import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  handleImageUpload
} from '../controllers/projects.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Routes publiques - accessibles sans authentification
router.get('/', getAllProjects);
router.get('/:id', getProjectById);

// Routes protégées - nécessitent une authentification
router.post('/', authenticateToken, handleImageUpload, createProject);
router.put('/:id', authenticateToken, handleImageUpload, updateProject);
router.delete('/:id', authenticateToken, deleteProject);

export default router;