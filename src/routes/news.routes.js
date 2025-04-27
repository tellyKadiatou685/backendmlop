// src/routes/news.routes.js
import express from 'express';
import {
  getAllNews,
  getNewsById,
  getNewsByCategory,
  createNews,
  updateNews,
  deleteNews,
  handleImageUpload
} from '../controllers/news.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Routes publiques - accessibles sans authentification
router.get('/', getAllNews);
router.get('/category/:category', getNewsByCategory);
router.get('/:id', getNewsById);

// Routes protégées - nécessitent une authentification
router.post('/', authenticateToken, handleImageUpload, createNews);
router.put('/:id', authenticateToken, handleImageUpload, updateNews);
router.delete('/:id', authenticateToken, deleteNews);

export default router;