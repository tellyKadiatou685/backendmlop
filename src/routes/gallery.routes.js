import express from "express";
import {
  createGalleryItem,
  getAllGalleryItems,
  getGalleryItemById,
  updateGalleryItem,
  deleteGalleryItem,
} from "../controllers/gallery.controller.js";
import {
   
    handleImageUpload
  } from '../controllers/news.controller.js';



const router = express.Router();

// Créer un média (image/vidéo)
router.post("/",  handleImageUpload, createGalleryItem);

// Récupérer tous les médias
router.get("/", getAllGalleryItems);

// Récupérer un média par ID
router.get("/:id", getGalleryItemById);

// Modifier un média (changer le fichier ou les infos)
router.put("/:id",  handleImageUpload, updateGalleryItem);

// Supprimer un média
router.delete("/:id", deleteGalleryItem);

export default router;
