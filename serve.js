import app from './src/app.js';
import dotenv from 'dotenv';
import cors from 'cors'; // Ajoutez cette ligne pour importer cors

// Charger les variables d'environnement
dotenv.config();

// Configurer CORS - à ajouter avant toute autre configuration de route
app.use(cors({
  origin: ['http://localhost:8081', 'http://192.168.1.21:8081'], // URLs de votre frontend en développement
  credentials: true
}));

const PORT = process.env.PORT || 3000;

// Lancer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});