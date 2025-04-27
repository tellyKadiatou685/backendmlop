import express from 'express';
import {
  getAllServices,
  getServicesByCategory,
  getServiceById,
  createService,
  updateService,
  deleteService,
  handleImageUpload
} from '../controllers/services.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Routes publiques - accessibles sans authentification
router.get('/', getAllServices);
router.get('/category/:category', getServicesByCategory);
router.get('/:id', getServiceById);

// Routes protégées - nécessitent une authentification
router.post('/',  handleImageUpload, createService);
router.put('/:id', authenticateToken, handleImageUpload, updateService);
router.delete('/:id', authenticateToken, deleteService);

export default router;