// src/controllers/news.controller.js
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cloudinary from '../utils/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

// Configuration du stockage en mémoire pour Cloudinary
const storage = multer.memoryStorage();

export const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // Limite à 20MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Erreur: Seules les images sont acceptées!'));
    }
  }
}).single('image'); // Changé de .any() à .single('image')

// Middleware d'upload
export const handleImageUpload = (req, res, next) => {
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      console.error('Erreur Multer:', err);
      return res.status(400).json({ message: `Erreur d'upload: ${err.message}` });
    } else if (err) {
      console.error('Erreur générale:', err);
      return res.status(400).json({ message: err.message });
    }
    
    console.log('Body après upload:', req.body);
    console.log('File après upload:', req.file);
    
    next();
  });
};

// Upload image vers Cloudinary
const uploadToCloudinary = async (fileBuffer, filename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder: 'news', 
        public_id: filename,
        resource_type: 'auto'
      },
      (error, result) => {
        if (error) {
          console.error('Erreur Cloudinary:', error);
          reject(error);
        } else {
          console.log('Image uploadée avec succès à:', result.secure_url);
          resolve(result.secure_url);
        }
      }
    );
    
    // Gestion des erreurs de stream
    uploadStream.on('error', (error) => {
      console.error('Erreur de stream Cloudinary:', error);
      reject(error);
    });
    
    // Envoi du buffer au stream
    uploadStream.end(fileBuffer);
  });
};

// Récupérer toutes les actualités
export const getAllNews = async (req, res) => {
  try {
    const news = await prisma.news.findMany({
      include: {
        author: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.status(200).json(news);
  } catch (error) {
    console.error('Erreur lors de la récupération des actualités:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des actualités' });
  }
};

// Récupérer une actualité par son ID
export const getNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const news = await prisma.news.findUnique({
      where: { id: Number(id) },
      include: {
        author: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });
    
    if (!news) {
      return res.status(404).json({ message: 'Actualité non trouvée' });
    }
    
    res.status(200).json(news);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'actualité:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'actualité' });
  }
};

// Créer une nouvelle actualité
export const createNews = async (req, res) => {
  try {
    console.log('Données reçues dans createNews:', req.body);
    console.log('Fichier reçu dans createNews:', req.file);
    console.log('User:', req.user);
    
    const { title, content, category } = req.body;
    const authorId = req.user.id;
    
    // Vérifier les données requises
    if (!title || !content) {
      return res.status(400).json({ message: 'Le titre et le contenu sont requis' });
    }
    
    // Gérer l'image si elle existe
    let imageUrl = null;
    if (req.file) {
      try {
        console.log('Tentative d\'upload de fichier:', {
          filename: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          bufferLength: req.file.buffer ? req.file.buffer.length : 0
        });
        
        const result = await uploadToCloudinary(
          req.file.buffer, 
          `news-${Date.now()}`
        );
        imageUrl = result;
        console.log('Image uploadée avec succès:', imageUrl);
      } catch (uploadError) {
        console.error('Erreur détaillée lors de l\'upload:', uploadError);
        // Ne pas arrêter le processus, continuer avec imageUrl = null
        console.log('Continuation du processus sans image');
      }
    }
    
    // Créer l'actualité
    const newNews = await prisma.news.create({
      data: {
        title,
        content,
        category,
        image: imageUrl,
        authorId
      },
      include: {
        author: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });
    
    console.log('Actualité créée avec succès:', newNews);
    res.status(201).json({
      message: 'Actualité créée avec succès',
      news: newNews
    });
  } catch (error) {
    console.error('Erreur détaillée lors de la création de l\'actualité:', error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'actualité' });
  }
};

// Mettre à jour une actualité
export const updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Données reçues dans updateNews:', req.body);
    console.log('Fichier reçu dans updateNews:', req.file);
    
    const { title, content, category } = req.body;
    
    // Vérifier si l'actualité existe
    const existingNews = await prisma.news.findUnique({
      where: { id: Number(id) }
    });
    
    if (!existingNews) {
      return res.status(404).json({ message: 'Actualité non trouvée' });
    }
    
    // Préparer les données à mettre à jour
    const updateData = {
      title: title || existingNews.title,
      content: content || existingNews.content,
      category: category || existingNews.category
    };
    
    // Gérer l'image si elle existe
    if (req.file) {
      try {
        console.log('Tentative d\'upload de fichier pour mise à jour:', {
          filename: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          bufferLength: req.file.buffer ? req.file.buffer.length : 0
        });
        
        const result = await uploadToCloudinary(
          req.file.buffer, 
          `news-update-${Date.now()}`
        );
        updateData.image = result;
        console.log('Image mise à jour avec succès:', updateData.image);
      } catch (uploadError) {
        console.error('Erreur détaillée lors de l\'upload pour mise à jour:', uploadError);
        // Garder l'ancienne image en cas d'erreur
        console.log('Conservation de l\'ancienne image en cas d\'erreur');
      }
    }
    
    // Mettre à jour l'actualité
    const updatedNews = await prisma.news.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });
    
    console.log('Actualité mise à jour avec succès:', updatedNews);
    res.status(200).json({
      message: 'Actualité mise à jour avec succès',
      news: updatedNews
    });
  } catch (error) {
    console.error('Erreur détaillée lors de la mise à jour de l\'actualité:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'actualité' });
  }
};

// Récupérer les actualités par catégorie
export const getNewsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    const news = await prisma.news.findMany({
      where: {
        category: category
      },
      include: {
        author: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.status(200).json(news);
  } catch (error) {
    console.error('Erreur lors de la récupération des actualités par catégorie:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des actualités par catégorie' });
  }
};

// Supprimer une actualité
export const deleteNews = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si l'actualité existe
    const existingNews = await prisma.news.findUnique({
      where: { id: Number(id) }
    });
    
    if (!existingNews) {
      return res.status(404).json({ message: 'Actualité non trouvée' });
    }
    
    // Supprimer l'actualité (pas besoin de supprimer l'image de Cloudinary)
    await prisma.news.delete({
      where: { id: Number(id) }
    });
    
    res.status(200).json({ message: 'Actualité supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'actualité:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'actualité' });
  }
};