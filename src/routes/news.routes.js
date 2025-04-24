// src/routes/news.routes.js
import express from 'express';
import { 
  getAllNews, 
  getNewsById, 
  createNews, 
  updateNews, 
  deleteNews,
  getNewsByCategory,
  upload // Importez upload au lieu de handleImageUpload
} from '../controllers/news.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Routes publiques
router.get('/', getAllNews);
router.get('/:id', getNewsById);

// Routes protégées
router.post('/', authenticateToken, upload.any(), createNews); // Utiliser upload.any() directement
router.put('/:id', authenticateToken, upload.any(), updateNews);
router.delete('/:id', authenticateToken, deleteNews);
// Dans votre fichier de routes
router.get('/news/category/:category', getNewsByCategory);

export default router;