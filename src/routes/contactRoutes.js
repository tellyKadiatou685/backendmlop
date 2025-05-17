// routes/contactRoutes.js

import express from 'express';
import { sendContactMessage, getAllMessages, updateMessageStatus, deleteMessage } from '../controllers/contactController.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Route publique pour envoyer un message de contact
router.post('/messages', sendContactMessage);

// Routes protégées nécessitant une authentification
router.get('/messages', authenticateToken, getAllMessages);
router.patch('/messages/:id/status', authenticateToken, updateMessageStatus);
router.delete('/messages/:id', authenticateToken, deleteMessage);

export default router;