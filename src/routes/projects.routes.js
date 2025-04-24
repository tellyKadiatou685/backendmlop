// src/routes/projects.routes.js
import express from 'express';
import { 
  getAllProjects, 
  getProjectById, 
  createProject, 
  updateProject, 
  deleteProject,
  upload
} from '../controllers/projects.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Routes publiques
router.get('/', getAllProjects);
router.get('/:id', getProjectById);

// Routes protégées (nécessitent une authentification)
router.post('/', authenticateToken, upload.single('image'), createProject);
router.put('/:id', authenticateToken, upload.single('image'), updateProject);
router.delete('/:id', authenticateToken, deleteProject);

export default router;