// =======================================================================
// src/config/constants.js — Constantes y Configuración de Firebase Mandala
// =======================================================================

export const APP_VERSION = "beta1.4";

// Credenciales compartidas con app_mdl_admision (Proyecto Firebase Mandala)
export const firebaseConfig = {
    apiKey: "AIzaSyCgAg2EwTJh4zbMdpkqG3VKTGfDeofblyg",
    authDomain: "priel-mdl-seguimientos.firebaseapp.com",
    projectId: "priel-mdl-seguimientos",
    storageBucket: "priel-mdl-seguimientos.firebasestorage.app",
    messagingSenderId: "118730133451",
    appId: "1:118730133451:web:9e407e81a9b22ae9d0704e"
};

// Nombres de colecciones en Firestore
export const COLLECTIONS = {
    ALUMNOS: "alumnos",                       // Padrón de alumnos compartido con Admisión
    FESTIVALES: "festivales",                 // Festivales vigentes y programados
    FESTIVALES_HISTORICO: "festivales_historico", // Carga masiva de festivales 2025-2026
    VENUES: "venues",                         // Directorio de salas / venues
    SESIONISTAS: "sesionistas",               // Directorio de músicos sesionistas
    INSTRUMENTOS: "instrumentos",             // Instrumentos maestros (compartido con Admisión)
    PRODUCTORA_CONFIG: "productora_config",   // Tarifas maestras de productora audiovisual
    USUARIOS_SISTEMA: "usuarios_sistema",     // Usuarios del ecosistema Mandala (compartido con Admisión)
    CAJA_FESTIVALES: "caja_festivales"        // Gastos e Ingresos manuales de Caja
};
