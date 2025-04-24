// src/controllers/auth.controller.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Fonction pour l'inscription simplifiée (juste email et mot de passe)
export const registerUser = async (req, res) => {
  const { email, password, username, role } = req.body;

  try {
    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: "Cette adresse email est déjà utilisée par un autre compte" 
      });
    }

    // Vérifier si le nom d'utilisateur existe déjà
    if (username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username }
      });
      
      if (existingUsername) {
        return res.status(400).json({ 
          message: "Ce nom d'utilisateur est déjà utilisé" 
        });
      }
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Déterminer le rôle (par défaut EDITOR, sauf si c'est le premier utilisateur)
    const userCount = await prisma.user.count();
    let userRole = role || 'EDITOR';
    
    // Si c'est le premier utilisateur, on lui attribue le rôle ADMIN
    if (userCount === 0) {
      userRole = 'ADMIN';
    }

    // Création de l'utilisateur
    const newUser = await prisma.user.create({
      data: {
        email,
        username: username || email.split('@')[0], // Utiliser la partie locale de l'email si pas de username
        password: hashedPassword,
        role: userRole
      }
    });

    // Générer un token JWT
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Renvoyer les informations sans le mot de passe
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      message: "Inscription réussie",
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Erreur d\'inscription:', error);
    res.status(500).json({ message: 'Erreur lors de l\'inscription', error: error.message });
  }
};

// Fonction de connexion
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Trouver l'utilisateur par email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Si l'utilisateur n'existe pas
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Générer un token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Renvoyer les informations sans le mot de passe
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(200).json({
      message: 'Connexion réussie',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ message: 'Erreur lors de la connexion', error: error.message });
  }
};

// Fonction pour obtenir le profil utilisateur
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Obtenu du middleware d'authentification

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // Ne pas inclure le mot de passe
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du profil', error: error.message });
  }
};

// Fonction pour mettre à jour le profil utilisateur
export const updateUserProfile = async (req, res) => {
  const { username, email } = req.body;
  const userId = req.user.id; // Obtenu du middleware d'authentification
  
  try {
    // Vérifier si le nom d'utilisateur existe déjà pour un autre utilisateur
    if (username) {
      const existingUsername = await prisma.user.findFirst({
        where: {
          username,
          NOT: {
            id: userId
          }
        }
      });
      
      if (existingUsername) {
        return res.status(400).json({ message: 'Ce nom d\'utilisateur est déjà utilisé' });
      }
    }
    
    // Vérifier si l'email existe déjà pour un autre utilisateur
    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email,
          NOT: {
            id: userId
          }
        }
      });
      
      if (existingEmail) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        email
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
    });

    res.status(200).json({ 
      message: 'Profil mis à jour avec succès',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du profil', error: error.message });
  }
};

// Fonction pour changer le mot de passe
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id; // Obtenu du middleware d'authentification

  try {
    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier l'ancien mot de passe
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.status(200).json({ message: 'Mot de passe changé avec succès' });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({ message: 'Erreur lors du changement de mot de passe', error: error.message });
  }
};

// Fonction pour mot de passe oublié - réinitialisation directe
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ message: 'Aucun compte n\'est associé à cet email' });
    }

    // Générer un token temporaire
    const resetToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Stocker le token dans la base de données
    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) // 1 heure
      },
    });

    // Ici, vous pourriez envoyer un email avec un lien contenant le token
    // Mais pour simplifier, nous retournons juste le token dans la réponse
    res.status(200).json({
      message: 'Un lien de réinitialisation a été créé',
      resetToken: resetToken
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation du mot de passe', error: error.message });
  }
};

// Fonction pour définir un nouveau mot de passe après réinitialisation
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Vérifier le token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    
    // Trouver l'utilisateur avec ce token
    const user = await prisma.user.findFirst({
      where: {
        id: decodedToken.id,
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Token invalide ou expiré' });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe et supprimer le token de réinitialisation
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      },
    });

    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation du mot de passe', error: error.message });
  }
};

// Middleware d'authentification
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token d\'authentification requis' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token invalide ou expiré' });
    }
    req.user = decoded;
    next();
  });
};

// Middleware pour vérifier le rôle d'administrateur
export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
  }
  next();
};

// Fonction pour obtenir tous les utilisateurs (admin uniquement)
export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({ users });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs', error: error.message });
  }
};

// Fonction pour supprimer un utilisateur (admin uniquement)
export const deleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier qu'on ne supprime pas le dernier admin
    if (user.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' }
      });
      
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Impossible de supprimer le dernier administrateur' });
      }
    }

    // Supprimer l'utilisateur
    await prisma.user.delete({
      where: { id: Number(userId) },
    });

    res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'utilisateur', error: error.message });
  }
};

// Fonction pour mettre à jour le rôle d'un utilisateur (admin uniquement)
export const updateUserRole = async (req, res) => {
  const { userId, role } = req.body;

  try {
    // Vérifier si le rôle est valide
    const validRoles = ['ADMIN', 'EDITOR', 'VIEWER'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier qu'on ne rétrograde pas le dernier admin
    if (user.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' }
      });
      
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Impossible de modifier le rôle du dernier administrateur' });
      }
    }

    // Mettre à jour le rôle
    const updatedUser = await prisma.user.update({
      where: { id: Number(userId) },
      data: { role },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });

    res.status(200).json({
      message: 'Rôle mis à jour avec succès',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du rôle:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du rôle', error: error.message });
  }
};