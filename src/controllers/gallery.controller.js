import cloudinary from '../utils/cloudinary.js';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

const prisma = new PrismaClient();

// Configuration de multer (stockage temporaire en mémoire)
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

        // Détermine le type de média (IMAGE ou VIDEO)
        const mediaType = result.resource_type === 'video' ? 'VIDEO' : 'IMAGE';

        const media = await prisma.gallery.create({
          data: {
            title: title || '',
            mediaUrl: result.secure_url,
            type: mediaType,
          },
        });

        res.status(201).json(media);
      }
    );

    uploadStream.end(file.buffer);
  } catch (error) {
    console.error('Erreur de création:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// 📝 Modifier un média
export const updateGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;
    const { title } = req.body;

    const media = await prisma.gallery.findUnique({ where: { id } });
    if (!media) return res.status(404).json({ message: 'Média non trouvé' });

    let updatedData = { title };

    if (file) {
      // Extrait l'ID public de l'URL Cloudinary existante
      const urlParts = media.mediaUrl.split('/');
      const publicIdWithExtension = urlParts[urlParts.length - 1];
      const publicIdParts = publicIdWithExtension.split('.');
      const folder = urlParts[urlParts.length - 2];
      const publicId = `${folder}/${publicIdParts[0]}`;

      // Supprimer l'ancien fichier
      try {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: media.type === 'VIDEO' ? 'video' : 'image',
        });
      } catch (deleteError) {
        console.warn('Erreur lors de la suppression du fichier Cloudinary:', deleteError);
        // Continue même si la suppression échoue
      }

      // Télécharger le nouveau fichier
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'mlomp_gallery',
          resource_type: 'auto',
        },
        async (error, result) => {
          if (error) return res.status(500).json({ message: 'Erreur Cloudinary', error });

          // Détermine le type de média (IMAGE ou VIDEO)
          const mediaType = result.resource_type === 'video' ? 'VIDEO' : 'IMAGE';

          updatedData = {
            ...updatedData,
            mediaUrl: result.secure_url,
            type: mediaType,
          };

          const updatedMedia = await prisma.gallery.update({
            where: { id },
            data: updatedData,
          });

          res.status(200).json(updatedMedia);
        }
      );

      uploadStream.end(file.buffer);
    } else {
      // Mise à jour sans nouveau fichier
      const updatedMedia = await prisma.gallery.update({
        where: { id },
        data: updatedData,
      });
      res.status(200).json(updatedMedia);
    }
  } catch (error) {
    console.error('Erreur de mise à jour:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ❌ Supprimer un média
export const deleteGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const media = await prisma.gallery.findUnique({ where: { id } });
    if (!media) return res.status(404).json({ message: 'Média non trouvé' });

    // Extrait l'ID public de l'URL Cloudinary
    const urlParts = media.mediaUrl.split('/');
    const publicIdWithExtension = urlParts[urlParts.length - 1];
    const publicIdParts = publicIdWithExtension.split('.');
    const folder = urlParts[urlParts.length - 2];
    const publicId = `${folder}/${publicIdParts[0]}`;

    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: media.type === 'VIDEO' ? 'video' : 'image',
      });
    } catch (deleteError) {
      console.warn('Erreur lors de la suppression du fichier Cloudinary:', deleteError);
      // Continue même si la suppression échoue
    }

    await prisma.gallery.delete({ where: { id } });

    res.status(200).json({ message: 'Média supprimé avec succès' });
  } catch (error) {
    console.error('Erreur de suppression:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// 📄 Lister tous les médias
export const getAllGalleryItems = async (req, res) => {
  try {
    const media = await prisma.gallery.findMany({ orderBy: { createdAt: 'desc' } });
    res.status(200).json(media);
  } catch (error) {
    console.error('Erreur de récupération:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// 🔍 Obtenir un média par ID
export const getGalleryItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const media = await prisma.gallery.findUnique({ where: { id } });

    if (!media) return res.status(404).json({ message: 'Média non trouvé' });

    res.status(200).json(media);
  } catch (error) {
    console.error('Erreur de récupération:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// 📦 Middleware pour upload
export const uploadMiddleware = upload.single('mediaUrl');