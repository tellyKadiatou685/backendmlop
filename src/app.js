import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path'; // Ajoutez cette ligne pour utiliser path
import { fileURLToPath } from 'url'; // Ajoutez cette ligne pour utiliser __dirname en ES modules

// Pour obtenir l'équivalent de __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config();

// Créer l'application Express
const app = express();

// Appliquer CORS avant tous les autres middlewares
const corsOptions = {
  origin: ['http://localhost:8081'], // Autoriser uniquement le front-end à cette adresse
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Méthodes autorisées
  allowedHeaders: ['Content-Type', 'Authorization'], // En-têtes autorisés
  credentials: true, // Autoriser les cookies et les sessions
};

// Appliquer le middleware CORS avec les options
app.use(cors(corsOptions));

// Appliquer express.json pour le parsing du corps des requêtes
app.use(express.json());

// Serveur des fichiers statiques dans /uploads
app.use('/uploads', cors(corsOptions), express.static(path.resolve(__dirname, '../uploads')));

// Configurer les sessions (doit être avant l'initialisation de passport)
import session from 'express-session';
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// Initialiser passport
 // Assure-toi que ce fichier existe et est correctement configuré

import authRoutes from './routes/auth.routes.js';
import servicesRoutes from './routes/services.routes.js';
import newsRoutes from './routes/news.routes.js';
import administrativeProceduresRoutes from './routes/administrativeProcedures.routes.js';




app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/Procedures', administrativeProceduresRoutes);
app.use('/api/investments', investmentRoutes);
// Route par défaut
app.get('/', (req, res) => {
  res.send('Bienvenue sur votre application e-commerce !');
});

// Exporter l'app pour pouvoir l'utiliser ailleurs (par exemple dans server.js)
export default app;
