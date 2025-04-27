// src/controllers/projects.controller.js
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
        folder: 'projects', 
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
    console.log('Données reçues dans createProject:', req.body);
    console.log('Fichier reçu dans createProject:', req.file);
    
    const { title, description, status, startDate, endDate, budget } = req.body;
    const managerId = req.user.id;
    
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
          `project-${Date.now()}`
        );
        imageUrl = result;
        console.log('Image uploadée avec succès:', imageUrl);
      } catch (uploadError) {
        console.error('Erreur détaillée lors de l\'upload:', uploadError);
        // Ne pas arrêter le processus, continuer avec imageUrl = null
        console.log('Continuation du processus sans image');
      }
    }
    
    const newProject = await prisma.project.create({
      data: {
        title,
        description,
        status: status || 'PLANNED',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        budget,
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
    
    console.log('Projet créé avec succès:', newProject);
    res.status(201).json({
      message: 'Projet créé avec succès',
      project: newProject
    });
  } catch (error) {
    console.error('Erreur détaillée lors de la création du projet:', error);
    res.status(500).json({ message: 'Erreur lors de la création du projet' });
  }
};

// Mettre à jour un projet
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Données reçues dans updateProject:', req.body);
    console.log('Fichier reçu dans updateProject:', req.file);
    
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
      title: title || existingProject.title,
      description: description || existingProject.description,
      status: status || existingProject.status,
      startDate: startDate ? new Date(startDate) : existingProject.startDate,
      endDate: endDate ? new Date(endDate) : existingProject.endDate,
      budget: budget || existingProject.budget
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
          `project-update-${Date.now()}`
        );
        updateData.image = result;
        console.log('Image mise à jour avec succès:', updateData.image);
      } catch (uploadError) {
        console.error('Erreur détaillée lors de l\'upload pour mise à jour:', uploadError);
        // Garder l'ancienne image en cas d'erreur
        console.log('Conservation de l\'ancienne image en cas d\'erreur');
      }
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
    
    console.log('Projet mis à jour avec succès:', updatedProject);
    res.status(200).json({
      message: 'Projet mis à jour avec succès',
      project: updatedProject
    });
  } catch (error) {
    console.error('Erreur détaillée lors de la mise à jour du projet:', error);
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
    
    // Supprimer le projet (pas besoin de supprimer l'image de Cloudinary)
    await prisma.project.delete({
      where: { id: Number(id) }
    });
    
    res.status(200).json({ message: 'Projet supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du projet:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du projet' });
  }
};