import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cloudinary from '../utils/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const prisma = new PrismaClient();

// Multer config mémoire (upload vers Cloudinary)
const storage = multer.memoryStorage();

export const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées.'));
    }
  }
}).any();

// Upload image vers Cloudinary
const uploadToCloudinary = async (fileBuffer, filename) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'services', public_id: filename },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    ).end(fileBuffer);
  });
};

// Middleware d'upload
export const handleImageUpload = (req, res, next) => {
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError || err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// GET all services
export const getAllServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({ orderBy: { createdAt: 'desc' } });
    res.status(200).json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET services by category
export const getServicesByCategory = async (req, res) => {
  const { category } = req.params;
  if (!['EDUCATION', 'SANTE', 'INFRASTRUCTURES'].includes(category)) {
    return res.status(400).json({ message: 'Catégorie invalide' });
  }
  try {
    const services = await prisma.service.findMany({
      where: { category },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET single service
export const getServiceById = async (req, res) => {
  const { id } = req.params;
  try {
    const service = await prisma.service.findUnique({ where: { id: Number(id) } });
    if (!service) return res.status(404).json({ message: 'Service non trouvé' });
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST create new service
export const createService = async (req, res) => {
  try {
    const { category, title, icon, description } = req.body;
    if (!category || !title || !description) {
      return res.status(400).json({ message: 'Champs requis manquants' });
    }

    if (!['EDUCATION', 'SANTE', 'INFRASTRUCTURES'].includes(category)) {
      return res.status(400).json({ message: 'Catégorie invalide' });
    }

    let imageUrl = null;
    if (req.files && req.files.length > 0) {
      const result = await uploadToCloudinary(req.files[0].buffer, `service-${Date.now()}`);
      imageUrl = result;
    }

    const newService = await prisma.service.create({
      data: {
        category,
        title,
        icon: icon || 'default-icon',
        description,
        image: imageUrl
      }
    });

    res.status(201).json({ message: 'Service créé avec succès', service: newService });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PUT update service
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, title, icon, description } = req.body;

    const existingService = await prisma.service.findUnique({ where: { id: Number(id) } });
    if (!existingService) return res.status(404).json({ message: 'Service non trouvé' });

    if (category && !['EDUCATION', 'SANTE', 'INFRASTRUCTURES'].includes(category)) {
      return res.status(400).json({ message: 'Catégorie invalide' });
    }

    let imageUrl = existingService.image;
    if (req.files && req.files.length > 0) {
      const result = await uploadToCloudinary(req.files[0].buffer, `service-${Date.now()}`);
      imageUrl = result;
    }

    const updatedService = await prisma.service.update({
      where: { id: Number(id) },
      data: {
        category: category || existingService.category,
        title: title || existingService.title,
        icon: icon || existingService.icon,
        description: description || existingService.description,
        image: imageUrl
      }
    });

    res.status(200).json({ message: 'Service mis à jour', service: updatedService });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// DELETE service
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const existingService = await prisma.service.findUnique({ where: { id: Number(id) } });
    if (!existingService) return res.status(404).json({ message: 'Service non trouvé' });

    await prisma.service.delete({ where: { id: Number(id) } });

    res.status(200).json({ message: 'Service supprimé' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
