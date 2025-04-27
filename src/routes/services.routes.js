import { Router } from 'express';
import {
  getAllServices,
  getServicesByCategory,
  getServiceById,
  createService,
  updateService,
  deleteService,
  handleImageUpload
} from '../controllers/services.controller.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

router.get('/', getAllServices);
router.get('/:category', getServicesByCategory);
router.get('/detail/:id', getServiceById);
router.post('/', authenticateToken, handleImageUpload, createService);
router.put('/:id', authenticateToken, handleImageUpload, updateService);
router.delete('/:id', authenticateToken, deleteService);

export default router;
