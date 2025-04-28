import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';

// Routes
import authRoutes from './routes/auth.routes.js';
import servicesRoutes from './routes/services.routes.js';
import newsRoutes from './routes/news.routes.js';
import administrativeProceduresRoutes from './routes/administrativeProcedures.routes.js';
import investmentRoutes from './routes/investments.routes.js'; // Assurez-vous que ce fichier existe
import projectsRoutes from './routes/projects.routes.js';

// Pour obtenir l'équivalent de __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config();

// Créer l'application Express
const app = express();

// Configuration CORS - TRÈS IMPORTANT de le mettre en premier
const corsOptions = {
  origin: [
    'http://localhost:8081',
    'http://localhost:5173',
    'http://192.168.1.21:8081',
    'https://mlomp-dynamique.onrender.com',
    'https://mlomp-dynamique-lid9-a9g0kxs5v.vercel.app'  // Si vous utilisez aussi Vercel
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // OPTIONS est important pour les requêtes préliminaires
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Appliquer le middleware CORS avec les options
app.use(cors(corsOptions));

// Répondre explicitement aux requêtes OPTIONS préliminaires
app.options('*', cors(corsOptions));

// Appliquer express.json pour le parsing du corps des requêtes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir des fichiers statiques dans /uploads
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Configurer les sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret_fallback_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Utiliser HTTPS en production
    maxAge: 24 * 60 * 60 * 1000 // 24 heures
  }
}));

// Middleware pour le logging des requêtes (optionnel mais utile pour déboguer)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'Non spécifié'}`);
  next();
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/Procedures', administrativeProceduresRoutes);
app.use('/api/investments', investmentRoutes); // Assurez-vous que investmentRoutes est bien défini
app.use('/api/projects', projectsRoutes);

// Route de test CORS
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS est correctement configuré!',
    origin: req.headers.origin || 'Origine inconnue',
    timestamp: new Date().toISOString()
  });
});

// Route par défaut
app.get('/', (req, res) => {
  res.send('Bienvenue sur l\'API de MLOMP!');
});

// Middleware de gestion des erreurs 404 - modifié pour éviter l'erreur path-to-regexp
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Middleware de gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({
    error: 'Erreur serveur',
    message: process.env.NODE_ENV === 'production' ? 'Une erreur est survenue' : err.message
  });
});

// Exporter l'app pour pouvoir l'utiliser ailleurs (par exemple dans server.js)
export default app;