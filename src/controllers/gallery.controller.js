import cloudinary from '../utils/cloudinary.js';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

const prisma = new PrismaClient();

// Configuration de multer (upload local temporaire)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 📥 Créer un média (image/vidéo)
export const createGalleryItem = async (req, res) => {
  try {
    const file = req.file;
    const { title } = req.body;

    if (!file) return res.status(400).json({ message: 'Aucun fichier fourni' });

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'mlomp_gallery',
        resource_type: 'auto',
      },
      async (error, result) => {
        if (error) return res.status(500).json({ message: 'Erreur Cloudinary', error });

        const media = await prisma.gallery.create({
          data: {
            title: title || '',
            url: result.secure_url,
            publicId: result.public_id,
            type: result.resource_type,
          },
        });

        res.status(201).json(media);
      }
    );

    uploadStream.end(file.buffer);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error });
  }
};

// 📝 Modifier un média
export const updateGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;
    const { title } = req.body;

    const media = await prisma.gallery.findUnique({ where: { id: parseInt(id) } });
    if (!media) return res.status(404).json({ message: 'Média non trouvé' });

    let updatedData = { title };

    if (file) {
      // Supprimer l'ancien fichier
      await cloudinary.uploader.destroy(media.publicId, {
        resource_type: media.type,
      });

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'mlomp_gallery',
          resource_type: 'auto',
        },
        async (error, result) => {
          if (error) return res.status(500).json({ message: 'Erreur Cloudinary', error });

          updatedData = {
            ...updatedData,
            url: result.secure_url,
            publicId: result.public_id,
            type: result.resource_type,
          };

          const updatedMedia = await prisma.gallery.update({
            where: { id: parseInt(id) },
            data: updatedData,
          });

          res.status(200).json(updatedMedia);
        }
      );

      uploadStream.end(file.buffer);
    } else {
      const updatedMedia = await prisma.gallery.update({
        where: { id: parseInt(id) },
        data: updatedData,
      });
      res.status(200).json(updatedMedia);
    }
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error });
  }
};

// ❌ Supprimer un média
export const deleteGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const media = await prisma.gallery.findUnique({ where: { id: parseInt(id) } });
    if (!media) return res.status(404).json({ message: 'Média non trouvé' });

    await cloudinary.uploader.destroy(media.publicId, {
      resource_type: media.type,
    });

    await prisma.gallery.delete({ where: { id: parseInt(id) } });

    res.status(200).json({ message: 'Média supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error });
  }
};

// 📄 Lister tous les médias
export const getAllGalleryItems = async (req, res) => {
  try {
    const media = await prisma.gallery.findMany({ orderBy: { createdAt: 'desc' } });
    res.status(200).json(media);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error });
  }
};

// 🔍 Obtenir un média par ID
export const getGalleryItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const media = await prisma.gallery.findUnique({ where: { id: parseInt(id) } });

    if (!media) return res.status(404).json({ message: 'Média non trouvé' });

    res.status(200).json(media);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error });
  }
};

// 📦 Middleware pour upload
export const uploadMiddleware = upload.single('file');
