// =======================================================================
// src/config/constants.js — Constantes y Configuración de Firebase Mandala
// =======================================================================

export const APP_VERSION = "v2.11";

// Clave inicial de las cuentas nuevas (la misma que usa Mandala Admisión). La persona debe cambiarla en su primer ingreso.
export const CLAVE_INICIAL_DEFECTO = "mandala333";

// Rol de las personas de sonido: solo ven los eventos en curso (lectura) y editan el Rider técnico y el REC
export const ROL_SONIDISTA = "sonidista_festivales";

// Rol "Planificador de clases" (v2.11): entra a Festivales en modo reducido (Eventos en solo lectura + Planificación)
export const ROL_PLANIFICADOR = "planificador_clases";

// Roles que cuentan como docente (los mismos que normaliza Mandala Admisión)
export const ROLES_DOCENTE = ["docente", "profesor", "evaluador"];

// API de Google Calendar (Apps Script compartido con Mandala Admisión)
export const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx033Es_BuZJk5x0MmyV-u8foA58ENNl1K3Cv-BE6ZeguXCG62UIQl5H4v94EB7MT0/exec";
export const SCRIPT_API_KEY = "mandala-seg-2026";

// Cuenta de emergencia: siempre puede ingresar (misma regla que en las reglas de Firestore de Admisión)
export const EMAIL_CUENTA_EMERGENCIA = "productora.mandalahouse@gmail.com";

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
    CAJA_FESTIVALES: "caja_festivales",       // Gastos e Ingresos manuales de Caja
    FESTIVALES_SONIDO: "festivales_sonido",   // Sonido del evento (Rider técnico, REC) y copia de lectura para sonidistas: aparte de las finanzas
    SONIDISTAS: "sonidistas",                 // Directorio de sonidistas (cada uno con su usuario de acceso)
    FESTIVALES_PLANIFICACION: "festivales_planificacion", // Clases de docentes que chocan con un evento (revisión y resoluciones)
    PROFESORES: "profesores",                 // Fichas de docentes de Admisión (correo_calendario)
    ACCESO: "acceso"                          // Lista de acceso (acceso/lista), compartida con Admisión
};
