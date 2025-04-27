// src/controllers/investments.controller.js
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
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite à 5MB
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
}).single('image');

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
        folder: 'investments', 
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

// Récupérer tous les investissements
export const getAllInvestments = async (req, res) => {
  try {
    const investments = await prisma.investment.findMany({
      include: {
        manager: {
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
    
    res.status(200).json(investments);
  } catch (error) {
    console.error('Erreur lors de la récupération des investissements:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des investissements' });
  }
};

// Récupérer les investissements par catégorie
export const getInvestmentsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    const investments = await prisma.investment.findMany({
      where: { category },
      include: {
        manager: {
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
    
    res.status(200).json(investments);
  } catch (error) {
    console.error('Erreur lors de la récupération des investissements par catégorie:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des investissements par catégorie' });
  }
};

// Récupérer un investissement par son ID
export const getInvestmentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const investment = await prisma.investment.findUnique({
      where: { id: Number(id) },
      include: {
        manager: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });
    
    if (!investment) {
      return res.status(404).json({ message: 'Investissement non trouvé' });
    }
    
    res.status(200).json(investment);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'investissement:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'investissement' });
  }
};

// Créer un nouvel investissement
export const createInvestment = async (req, res) => {
  try {
    console.log('Données reçues dans createInvestment:', req.body);
    console.log('Fichier reçu dans createInvestment:', req.file);
    
    const { title, category, description, shortDescription, amount, startYear, endYear, status } = req.body;
    const managerId = req.user?.id;
    
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
          `investment-${Date.now()}`
        );
        imageUrl = result;
        console.log('Image uploadée avec succès:', imageUrl);
      } catch (uploadError) {
        console.error('Erreur détaillée lors de l\'upload:', uploadError);
        // Ne pas arrêter le processus, continuer avec imageUrl = null
        console.log('Continuation du processus sans image');
      }
    }
    
    const newInvestment = await prisma.investment.create({
      data: {
        title,
        category,
        description,
        shortDescription,
        amount,
        startYear,
        endYear,
        status,
        image: imageUrl,
        managerId
      },
      include: {
        manager: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });
    
    console.log('Investissement créé avec succès:', newInvestment);
    res.status(201).json({
      message: 'Investissement créé avec succès',
      investment: newInvestment
    });
  } catch (error) {
    console.error('Erreur détaillée lors de la création de l\'investissement:', error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'investissement' });
  }
};

// Mettre à jour un investissement
export const updateInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Données reçues dans updateInvestment:', req.body);
    console.log('Fichier reçu dans updateInvestment:', req.file);
    
    const { title, category, description, shortDescription, amount, startYear, endYear, status } = req.body;
    
    // Vérifier si l'investissement existe
    const existingInvestment = await prisma.investment.findUnique({
      where: { id: Number(id) }
    });
    
    if (!existingInvestment) {
      return res.status(404).json({ message: 'Investissement non trouvé' });
    }
    
    // Préparer les données à mettre à jour
    const updateData = {
      title: title || existingInvestment.title,
      category: category || existingInvestment.category,
      description: description || existingInvestment.description,
      shortDescription: shortDescription || existingInvestment.shortDescription,
      amount: amount || existingInvestment.amount,
      startYear: startYear || existingInvestment.startYear,
      endYear: endYear || existingInvestment.endYear,
      status: status || existingInvestment.status
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
          `investment-update-${Date.now()}`
        );
        updateData.image = result;
        console.log('Image mise à jour avec succès:', updateData.image);
      } catch (uploadError) {
        console.error('Erreur détaillée lors de l\'upload pour mise à jour:', uploadError);
        // Garder l'ancienne image en cas d'erreur
        console.log('Conservation de l\'ancienne image en cas d\'erreur');
      }
    }
    
    // Mettre à jour l'investissement
    const updatedInvestment = await prisma.investment.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        manager: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });
    
    console.log('Investissement mis à jour avec succès:', updatedInvestment);
    res.status(200).json({
      message: 'Investissement mis à jour avec succès',
      investment: updatedInvestment
    });
  } catch (error) {
    console.error('Erreur détaillée lors de la mise à jour de l\'investissement:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'investissement' });
  }
};

// Supprimer un investissement
export const deleteInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si l'investissement existe
    const existingInvestment = await prisma.investment.findUnique({
      where: { id: Number(id) }
    });
    
    if (!existingInvestment) {
      return res.status(404).json({ message: 'Investissement non trouvé' });
    }
    
    // Supprimer l'investissement (pas besoin de supprimer l'image de Cloudinary)
    await prisma.investment.delete({
      where: { id: Number(id) }
    });
    
    res.status(200).json({ message: 'Investissement supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'investissement:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'investissement' });
  }
};