import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cloudinary from '../utils/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const prisma = new PrismaClient();

// Configuration de multer pour le stockage en mémoire
const storage = multer.memoryStorage();

export const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limite à 10MB
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
}).single('file'); // Changé de .any() à .single('file') pour plus de clarté

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
    
    // Affichage des données reçues pour debugging
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
        folder: 'services', 
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

// GET all services
export const getAllServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({ orderBy: { createdAt: 'desc' } });
    res.status(200).json(services);
  } catch (error) {
    console.error('Erreur getAllServices:', error);
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
    console.error('Erreur getServicesByCategory:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET single service
export const getServiceById = async (req, res) => {
  const { id } = req.params;
  try {
    const service = await prisma.service.findUnique({ 
      where: { id: Number(id) } 
    });
    
    if (!service) {
      return res.status(404).json({ message: 'Service non trouvé' });
    }
    
    res.status(200).json(service);
  } catch (error) {
    console.error('Erreur getServiceById:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST create new service
export const createService = async (req, res) => {
  try {
    console.log('Données reçues dans createService:', req.body);
    console.log('Fichier reçu dans createService:', req.file);

    // Extraction des champs du formulaire
    const { category, title, icon, description } = req.body;

    // Validation des champs requis
    if (!category) {
      return res.status(400).json({ message: 'Le champ category est manquant' });
    }
    if (!title) {
      return res.status(400).json({ message: 'Le champ title est manquant' });
    }
    if (!description) {
      return res.status(400).json({ message: 'Le champ description est manquant' });
    }

    // Validation de la catégorie
    if (!['EDUCATION', 'SANTE', 'INFRASTRUCTURES'].includes(category)) {
      return res.status(400).json({ message: 'Catégorie invalide' });
    }

    // Gestion de l'image
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
          `service-${Date.now()}`
        );
        imageUrl = result;
        console.log('Image uploadée avec succès:', imageUrl);
      } catch (uploadError) {
        console.error('Erreur détaillée lors de l\'upload:', uploadError);
        // Ne pas arrêter le processus, continuer avec imageUrl = null
        console.log('Continuation du processus sans image');
      }
    }

    // Création du service dans la base de données
    const newService = await prisma.service.create({
      data: {
        category,
        title,
        icon: icon || 'default-icon',
        description,
        image: imageUrl
      }
    });

    res.status(201).json({ 
      message: 'Service créé avec succès', 
      service: newService 
    });
  } catch (error) {
    console.error('Erreur createService:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PUT update service
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Données reçues dans updateService:', req.body);
    console.log('Fichier reçu dans updateService:', req.file);

    // Extraction des champs du formulaire
    const { category, title, icon, description } = req.body;

    // Vérification que le service existe
    const existingService = await prisma.service.findUnique({ 
      where: { id: Number(id) } 
    });
    
    if (!existingService) {
      return res.status(404).json({ message: 'Service non trouvé' });
    }

    // Validation de la catégorie si elle est fournie
    if (category && !['EDUCATION', 'SANTE', 'INFRASTRUCTURES'].includes(category)) {
      return res.status(400).json({ message: 'Catégorie invalide' });
    }

    // Gestion de l'image
    let imageUrl = existingService.image;
    if (req.file) {
      try {
        const result = await uploadToCloudinary(
          req.file.buffer, 
          `service-${Date.now()}`
        );
        imageUrl = result;
        console.log('Image mise à jour avec succès:', imageUrl);
      } catch (uploadError) {
        console.error('Erreur lors de l\'upload de l\'image:', uploadError);
        return res.status(500).json({ message: 'Erreur lors de l\'upload de l\'image' });
      }
    }

    // Mise à jour du service
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

    res.status(200).json({ 
      message: 'Service mis à jour avec succès', 
      service: updatedService 
    });
  } catch (error) {
    console.error('Erreur updateService:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// DELETE service
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérification que le service existe
    const existingService = await prisma.service.findUnique({ 
      where: { id: Number(id) } 
    });
    
    if (!existingService) {
      return res.status(404).json({ message: 'Service non trouvé' });
    }

    // Suppression du service
    await prisma.service.delete({ 
      where: { id: Number(id) } 
    });

    res.status(200).json({ message: 'Service supprimé avec succès' });
  } catch (error) {
    console.error('Erreur deleteService:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};