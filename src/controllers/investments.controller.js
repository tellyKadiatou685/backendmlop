// src/controllers/investments.controller.js
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
    const uploadDir = path.join(__dirname, '../../uploads/investments');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'investment-' + uniqueSuffix + ext);
  }
});

export const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite à 5MB
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
    const { title, category, description, shortDescription, amount, startYear, endYear, status } = req.body;
    const managerId = req.user?.id;
    
    let imageFilename = null;
    if (req.file) {
      imageFilename = req.file.filename;
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
        image: imageFilename,
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
    
    res.status(201).json({
      message: 'Investissement créé avec succès',
      investment: newInvestment
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'investissement:', error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'investissement' });
  }
};

// Mettre à jour un investissement
export const updateInvestment = async (req, res) => {
  try {
    const { id } = req.params;
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
      title,
      category,
      description,
      shortDescription,
      amount,
      startYear,
      endYear,
      status
    };
    
    // Traiter l'image si elle est fournie
    if (req.file) {
      // Supprimer l'ancienne image si elle existe
      if (existingInvestment.image) {
        const imagePath = path.join(__dirname, '../../uploads/investments', existingInvestment.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
      
      updateData.image = req.file.filename;
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
    
    res.status(200).json({
      message: 'Investissement mis à jour avec succès',
      investment: updatedInvestment
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'investissement:', error);
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
    
    // Supprimer l'image associée si elle existe
    if (existingInvestment.image) {
      const imagePath = path.join(__dirname, '../../uploads/investments', existingInvestment.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    // Supprimer l'investissement
    await prisma.investment.delete({
      where: { id: Number(id) }
    });
    
    res.status(200).json({ message: 'Investissement supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'investissement:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'investissement' });
  }
};