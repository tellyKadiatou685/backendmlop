// src/controllers/administrativeProcedures.controller.js
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

// Récupérer toutes les démarches administratives
export const getAllProcedures = async (req, res) => {
  try {
    const procedures = await prisma.administrativeProcedure.findMany({
      orderBy: {
        title: 'asc'
      }
    });
    
    res.status(200).json(procedures);
  } catch (error) {
    console.error('Erreur lors de la récupération des démarches administratives:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des démarches administratives' });
  }
};

// Récupérer les démarches par catégorie
export const getProceduresByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    const procedures = await prisma.administrativeProcedure.findMany({
      where: { category },
      orderBy: {
        title: 'asc'
      }
    });
    
    res.status(200).json(procedures);
  } catch (error) {
    console.error('Erreur lors de la récupération des démarches administratives par catégorie:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des démarches administratives par catégorie' });
  }
};

// Récupérer une démarche par son ID
export const getProcedureById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const procedure = await prisma.administrativeProcedure.findUnique({
      where: { id: Number(id) }
    });
    
    if (!procedure) {
      return res.status(404).json({ message: 'Démarche administrative non trouvée' });
    }
    
    res.status(200).json(procedure);
  } catch (error) {
    console.error('Erreur lors de la récupération de la démarche administrative:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de la démarche administrative' });
  }
};

// Créer une nouvelle démarche administrative
export const createProcedure = async (req, res) => {
  try {
    const { title, description, icon, requiredDocs, processingTime, category, onlineUrl } = req.body;
    
    // Vérifier les données requises
    if (!title || !description || !processingTime || !category) {
      return res.status(400).json({ message: 'Veuillez fournir toutes les informations requises' });
    }
    
    // Traiter les documents requis (conversion en JSON si nécessaire)
    let processedRequiredDocs = requiredDocs;
    if (typeof requiredDocs === 'object') {
      processedRequiredDocs = JSON.stringify(requiredDocs);
    }
    
    // Créer la démarche
    const newProcedure = await prisma.administrativeProcedure.create({
      data: {
        title,
        description,
        icon,
        requiredDocs: processedRequiredDocs,
        processingTime: Number(processingTime),
        category,
        onlineUrl
      }
    });
    
    res.status(201).json({
      message: 'Démarche administrative créée avec succès',
      procedure: newProcedure
    });
  } catch (error) {
    console.error('Erreur lors de la création de la démarche administrative:', error);
    res.status(500).json({ message: 'Erreur lors de la création de la démarche administrative' });
  }
};

// Mettre à jour une démarche administrative
export const updateProcedure = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, icon, requiredDocs, processingTime, category, onlineUrl } = req.body;
    
    // Vérifier si la démarche existe
    const existingProcedure = await prisma.administrativeProcedure.findUnique({
      where: { id: Number(id) }
    });
    
    if (!existingProcedure) {
      return res.status(404).json({ message: 'Démarche administrative non trouvée' });
    }
    
    // Traiter les documents requis (conversion en JSON si nécessaire)
    let processedRequiredDocs = requiredDocs;
    if (typeof requiredDocs === 'object') {
      processedRequiredDocs = JSON.stringify(requiredDocs);
    }
    
    // Préparer les données à mettre à jour
    const updateData = {
      title: title || existingProcedure.title,
      description: description || existingProcedure.description,
      icon: icon !== undefined ? icon : existingProcedure.icon,
      requiredDocs: processedRequiredDocs || existingProcedure.requiredDocs,
      processingTime: processingTime ? Number(processingTime) : existingProcedure.processingTime,
      category: category || existingProcedure.category,
      onlineUrl: onlineUrl !== undefined ? onlineUrl : existingProcedure.onlineUrl
    };
    
    // Mettre à jour la démarche
    const updatedProcedure = await prisma.administrativeProcedure.update({
      where: { id: Number(id) },
      data: updateData
    });
    
    res.status(200).json({
      message: 'Démarche administrative mise à jour avec succès',
      procedure: updatedProcedure
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la démarche administrative:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la démarche administrative' });
  }
};

// Supprimer une démarche administrative
export const deleteProcedure = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si la démarche existe
    const existingProcedure = await prisma.administrativeProcedure.findUnique({
      where: { id: Number(id) }
    });
    
    if (!existingProcedure) {
      return res.status(404).json({ message: 'Démarche administrative non trouvée' });
    }
    
    // Supprimer la démarche
    await prisma.administrativeProcedure.delete({
      where: { id: Number(id) }
    });
    
    res.status(200).json({ message: 'Démarche administrative supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la démarche administrative:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la démarche administrative' });
  }
};