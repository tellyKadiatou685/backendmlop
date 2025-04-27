import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Vérifier que les variables d'environnement sont définies
const requiredVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`⚠️ Variables d'environnement manquantes: ${missingVars.join(', ')}`);
  console.error('⚠️ L\'upload d\'images ne fonctionnera pas correctement');
} else {
  console.log('✅ Configuration Cloudinary chargée');
}

// Configuration de Cloudinary avec vos identifiants
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export default cloudinary;