// src/controllers/projects.controller.js
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const { dirname } = path;

const prisma = new PrismaClient();

// Configuration du stockage des images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/projects');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'project-' + uniqueSuffix + ext);
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

// Récupérer tous les projets
export const getAllProjects = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        manager: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    });
    
    res.status(200).json(projects);
  } catch (error) {
    console.error('Erreur lors de la récupération des projets:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des projets' });
  }
};

// Récupérer un projet par son ID
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await prisma.project.findUnique({
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
    
    if (!project) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }
    
    res.status(200).json(project);
  } catch (error) {
    console.error('Erreur lors de la récupération du projet:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du projet' });
  }
};

// Créer un nouveau projet
export const createProject = async (req, res) => {
  try {
    const { title, description, status, startDate, endDate, budget } = req.body;
    const managerId = req.user.id;
    
    let imageFilename = null;
    if (req.file) {
      imageFilename = req.file.filename;
    }
    
    const newProject = await prisma.project.create({
      data: {
        title,
        description,
        status: status || 'PLANNED',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        budget,
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
      message: 'Projet créé avec succès',
      project: newProject
    });
  } catch (error) {
    console.error('Erreur lors de la création du projet:', error);
    res.status(500).json({ message: 'Erreur lors de la création du projet' });
  }
};

// Mettre à jour un projet
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, startDate, endDate, budget } = req.body;
    
    // Vérifier si le projet existe
    const existingProject = await prisma.project.findUnique({
      where: { id: Number(id) }
    });
    
    if (!existingProject) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }
    
    // Préparer les données à mettre à jour
    const updateData = {
      title,
      description,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : null,
      budget
    };
    
    // Traiter l'image si elle est fournie
    if (req.file) {
      // Supprimer l'ancienne image si elle existe
      if (existingProject.image) {
        const imagePath = path.join(__dirname, '../../uploads/projects', existingProject.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
      
      updateData.image = req.file.filename;
    }
    
    // Mettre à jour le projet
    const updatedProject = await prisma.project.update({
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
      message: 'Projet mis à jour avec succès',
      project: updatedProject
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du projet:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du projet' });
  }
};

// Supprimer un projet
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si le projet existe
    const existingProject = await prisma.project.findUnique({
      where: { id: Number(id) }
    });
    
    if (!existingProject) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }
    
    // Supprimer l'image associée si elle existe
    if (existingProject.image) {
      const imagePath = path.join(__dirname, '../../uploads/projects', existingProject.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    // Supprimer le projet
    await prisma.project.delete({
      where: { id: Number(id) }
    });
    
    res.status(200).json({ message: 'Projet supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du projet:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du projet' });
  }
};