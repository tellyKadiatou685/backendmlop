// src/controllers/news.controller.js
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

// Configuration du stockage des images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/news');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'news-' + uniqueSuffix + ext);
  }
});

export const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // Limite à 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb('Erreur: Seules les images sont acceptées!');
    }
  }
});

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
      console.log('Body reçu:', req.body);
      console.log('Files reçus:', req.files);
      console.log('User:', req.user);
      
      const { title, content, category } = req.body;
      const authorId = req.user.id;
      
      // Vérifier les données requises
      if (!title || !content) {
        return res.status(400).json({ message: 'Le titre et le contenu sont requis' });
      }
      
      // Gérer l'image si elle existe
      let imageFilename = null;
      if (req.files && req.files.length > 0) {
        imageFilename = req.files[0].filename;
        console.log("Fichier trouvé:", req.files[0].originalname, "dans le champ", req.files[0].fieldname);
      }
      
      // Créer l'actualité
      const newNews = await prisma.news.create({
        data: {
          title,
          content,
          category,
          image: imageFilename,
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
      
      res.status(201).json({
        message: 'Actualité créée avec succès',
        news: newNews
      });
    } catch (error) {
      console.error('Erreur lors de la création de l\'actualité:', error);
      res.status(500).json({ message: 'Erreur lors de la création de l\'actualité' });
    }
  };

// Mettre à jour une actualité
export const updateNews = async (req, res) => {
  try {
    const { id } = req.params;
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
      title,
      content,
      category
    };
    
    // Traiter l'image si elle est fournie
    if (req.file) {
      // Supprimer l'ancienne image si elle existe
      if (existingNews.image) {
        const imagePath = path.join(__dirname, '../../uploads/news', existingNews.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
      
      updateData.image = req.file.filename;
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
    
    res.status(200).json({
      message: 'Actualité mise à jour avec succès',
      news: updatedNews
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'actualité:', error);
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
    
    // Supprimer l'image associée si elle existe
    if (existingNews.image) {
      const imagePath = path.join(__dirname, '../../uploads/news', existingNews.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    // Supprimer l'actualité
    await prisma.news.delete({
      where: { id: Number(id) }
    });
    
    res.status(200).json({ message: 'Actualité supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'actualité:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'actualité' });
  }
};