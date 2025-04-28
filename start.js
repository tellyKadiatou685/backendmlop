import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';

// Routes
import authRoutes from './src/routes/auth.routes.js';
import servicesRoutes from './src/routes/services.routes.js';
import newsRoutes from './src/routes/news.routes.js';
import administrativeProceduresRoutes from './src/routes/administrativeProcedures.routes.js';
import investmentRoutes from './src/routes/investments.routes.js';
import projectsRoutes from './src/routes/projects.routes.js';

// Pour obtenir l'équivalent de __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config();

// Créer l'application Express
const app = express();

// Configuration CORS
app.use(cors({
  origin: [
    'http://localhost:8081',
    'http://localhost:5173',
    'http://192.168.1.21:8081',
    'https://mlomp-dynamique.onrender.com',
    'https://mlomp-dynamique.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Répondre aux requêtes OPTIONS
app.options('*', cors());

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuration des sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret_fallback_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/Procedures', administrativeProceduresRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/projects', projectsRoutes);

// Route par défaut
app.get('/', (req, res) => {
  res.send('API de MLOMP opérationnelle');
});

// Gestion des routes inexistantes
app.use((req, res) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});