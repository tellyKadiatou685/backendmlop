// src/routes/auth.routes.js
import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  getAllUsers,
  deleteUser,
  updateUserRole,
  authenticateToken,
  isAdmin
} from '../controllers/auth.controller.js';

const router = express.Router();

// Routes publiques
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Routes protégées - nécessitent une authentification
router.get('/profile', authenticateToken, getUserProfile);
router.put('/profile', authenticateToken, updateUserProfile);
router.put('/change-password', authenticateToken, changePassword);

// Routes d'administration - nécessitent authentification + rôle admin
router.get('/users', authenticateToken, isAdmin, getAllUsers);
router.delete('/users/:userId', authenticateToken, isAdmin, deleteUser);
router.put('/users/role', authenticateToken, isAdmin, updateUserRole);

export default router;