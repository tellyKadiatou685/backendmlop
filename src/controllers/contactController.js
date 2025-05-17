// controllers/contactController.js

import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

// Configuration du transporteur d'emails (à ajuster selon votre service d'email)
const transporter = nodemailer.createTransport({
  service: 'gmail', // ou un autre service comme 'SendGrid', 'Mailgun', etc.
  auth: {
    user: process.env.EMAIL_USER, // À définir dans votre fichier .env
    pass: process.env.EMAIL_PASSWORD // À définir dans votre fichier .env
  }
});

// Envoyer un message de contact
export const sendContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation des champs requis
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    // Validation de l'email avec une regex simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Adresse email invalide' });
    }

    // Enregistrement du message dans la base de données
    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        subject,
        message
      }
    });

    // Configuration de l'email à envoyer
    const mailOptions = {
      from: `"Site Mlomp" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || 'contact@mlomp.sn', // Email de réception configuré dans .env
      replyTo: email, // Pour que la réponse aille directement à l'expéditeur
      subject: `Nouveau message de contact: ${subject}`,
      html: `
        <h2>Nouveau message de contact reçu</h2>
        <p><strong>De :</strong> ${name} &lt;${email}&gt;</p>
        <p><strong>Sujet :</strong> ${subject}</p>
        <p><strong>Message :</strong></p>
        <div style="padding: 10px; background-color: #f5f5f5; border-left: 4px solid #28a745;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <p>Ce message a été envoyé depuis le formulaire de contact du site de la commune de Mlomp.</p>
      `
    };

    // Envoi de l'email
    await transporter.sendMail(mailOptions);

    // Email de confirmation à l'expéditeur
    const confirmationMailOptions = {
      from: `"Commune de Mlomp" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Confirmation de réception de votre message',
      html: `
        <h2>Bonjour ${name},</h2>
        <p>Nous vous confirmons la bonne réception de votre message avec le sujet: "${subject}".</p>
        <p>Notre équipe vous répondra dans les meilleurs délais.</p>
        <p>Cordialement,</p>
        <p>L'équipe de la Commune de Mlomp</p>
      `
    };

    // Envoi de l'email de confirmation
    await transporter.sendMail(confirmationMailOptions);

    res.status(201).json({
      success: true,
      message: 'Votre message a été envoyé avec succès',
      data: contactMessage
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    res.status(500).json({
      error: 'Une erreur est survenue lors de l\'envoi du message',
      details: error.message
    });
  }
};

// Récupérer tous les messages (pour le tableau de bord admin)
export const getAllMessages = async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.status(200).json(messages);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({
      error: 'Une erreur est survenue lors de la récupération des messages',
      details: error.message
    });
  }
};

// Mettre à jour le statut d'un message
export const updateMessageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Vérifier que le statut est valide
    const validStatuses = ['PENDING', 'READ', 'REPLIED', 'ARCHIVED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const updatedMessage = await prisma.contactMessage.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    res.status(200).json({
      success: true,
      message: 'Statut du message mis à jour avec succès',
      data: updatedMessage
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({
      error: 'Une erreur est survenue lors de la mise à jour du statut',
      details: error.message
    });
  }
};

// Supprimer un message
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.contactMessage.delete({
      where: { id: parseInt(id) }
    });

    res.status(200).json({
      success: true,
      message: 'Message supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du message:', error);
    res.status(500).json({
      error: 'Une erreur est survenue lors de la suppression du message',
      details: error.message
    });
  }
};