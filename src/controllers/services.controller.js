// src/controllers/services.controller.js
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

// Configuration pour l'upload d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/services');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'service-' + uniqueSuffix + ext);
  }
});

// Configuration multer pour accepter n'importe quel champ
export const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limite à 5MB
  fileFilter: (req, file, cb) => {
    console.log('Fichier reçu:', file.fieldname, file.originalname, file.mimetype);
    
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Erreur: Seules les images sont acceptées!'));
    }
  }
}).any(); // Accepte n'importe quel champ de fichier

// Récupérer tous les services
export const getAllServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.status(200).json(services);
  } catch (error) {
    console.error('Erreur lors de la récupération des services:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des services' });
  }
};

// Récupérer les services par catégorie
export const getServicesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    // Vérifier que la catégorie est valide
    if (!['EDUCATION', 'SANTE', 'INFRASTRUCTURES'].includes(category)) {
      return res.status(400).json({ message: 'Catégorie invalide' });
    }
    
    const services = await prisma.service.findMany({
      where: { category },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.status(200).json(services);
  } catch (error) {
    console.error('Erreur lors de la récupération des services:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des services' });
  }
};

// Récupérer un service par son ID
export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = await prisma.service.findUnique({
      where: { id: Number(id) }
    });
    
    if (!service) {
      return res.status(404).json({ message: 'Service non trouvé' });
    }
    
    res.status(200).json(service);
  } catch (error) {
    console.error('Erreur lors de la récupération du service:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du service' });
  }
};

// Middleware pour traiter l'upload d'image
export const handleImageUpload = (req, res, next) => {
  console.log("Headers:", req.headers);
  console.log("Content-Type:", req.headers['content-type']);
  
  upload(req, res, function(err) {
    console.log("Req body après upload:", req.body);
    console.log("Req files après upload:", req.files);
    
    if (err instanceof multer.MulterError) {
      console.error('Erreur Multer:', err);
      return res.status(400).json({ message: `Erreur lors de l'upload de l'image: ${err.message}` });
    } else if (err) {
      console.error('Erreur:', err);
      return res.status(400).json({ message: `Erreur: ${err.message}` });
    }
    
    // Tout est OK, passer au contrôleur suivant
    next();
  });
};

// Créer un nouveau service
export const createService = async (req, res) => {
  try {
    console.log('Body reçu:', req.body);
    console.log('Files reçus:', req.files);
    
    const { category, title, icon, description } = req.body;
    
    // Vérifier les données requises
    if (!category || !title || !description) {
      return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis' });
    }
    
    // Vérifier que la catégorie est valide
    if (!['EDUCATION', 'SANTE', 'INFRASTRUCTURES'].includes(category)) {
      return res.status(400).json({ message: 'Catégorie invalide' });
    }
    
    // Gérer l'image si elle existe
    let imageFilename = null;
    if (req.files && req.files.length > 0) {
      imageFilename = req.files[0].filename;
      console.log("Fichier trouvé:", req.files[0].originalname, "dans le champ", req.files[0].fieldname);
    }

    // Créer le service
    const newService = await prisma.service.create({
      data: {
        category,
        title,
        icon: icon || 'default-icon', // Valeur par défaut si non fournie
        description,
        image: imageFilename
      }
    });
    
    res.status(201).json({
      message: 'Service créé avec succès',
      service: newService
    });
  } catch (error) {
    console.error('Erreur lors de la création du service:', error);
    res.status(500).json({ message: 'Erreur lors de la création du service' });
  }
};

// Mettre à jour un service
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, title, icon, description } = req.body;
    
    // Vérifier si le service existe
    const existingService = await prisma.service.findUnique({
      where: { id: Number(id) }
    });
    
    if (!existingService) {
      return res.status(404).json({ message: 'Service non trouvé' });
    }
    
    // Vérifier que la catégorie est valide si fournie
    if (category && !['EDUCATION', 'SANTE', 'INFRASTRUCTURES'].includes(category)) {
      return res.status(400).json({ message: 'Catégorie invalide' });
    }
    
    // Préparer les données à mettre à jour
    const updateData = {
      category: category || existingService.category,
      title: title || existingService.title,
      description: description || existingService.description,
      icon: icon || existingService.icon
    };
    
    // Traiter l'image si elle est fournie
    if (req.files && req.files.length > 0) {
      // Supprimer l'ancienne image si elle existe
      if (existingService.image) {
        const imagePath = path.join(__dirname, '../../uploads/services', existingService.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
      
      updateData.image = req.files[0].filename;
    }
    
    // Mettre à jour le service
    const updatedService = await prisma.service.update({
      where: { id: Number(id) },
      data: updateData
    });
    
    res.status(200).json({
      message: 'Service mis à jour avec succès',
      service: updatedService
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du service:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du service' });
  }
};

// Supprimer un service
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si le service existe
    const existingService = await prisma.service.findUnique({
      where: { id: Number(id) }
    });
    
    if (!existingService) {
      return res.status(404).json({ message: 'Service non trouvé' });
    }
    
    // Supprimer l'image associée si elle existe
    if (existingService.image) {
      const imagePath = path.join(__dirname, '../../uploads/services', existingService.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    // Supprimer le service
    await prisma.service.delete({
      where: { id: Number(id) }
    });
    
    res.status(200).json({ message: 'Service supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du service:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du service' });
  }
};