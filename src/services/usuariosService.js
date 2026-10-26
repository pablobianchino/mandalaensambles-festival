// =======================================================================
// src/services/usuariosService.js — Servicio de Usuarios del Ecosistema Mandala
// Reutiliza y sincroniza con la colección 'usuarios_sistema' de Firestore
// =======================================================================

import { db, collection, getDocs, doc, getDoc } from "../config/firebase.js";
import { COLLECTIONS } from "../config/constants.js";

/**
 * Cache en memoria de usuarios del sistema
 */
let usuariosCache = [];

/**
 * Obtener todos los usuarios registrados en 'usuarios_sistema'
 * @param {boolean} forzarRefresco - Si es true, ignora la caché y consulta Firestore
 * @returns {Promise<Array>} Lista de usuarios
 */
export async function obtenerUsuariosSistemaFirestore(forzarRefresco = false) {
    if (usuariosCache.length > 0 && !forzarRefresco) {
        return usuariosCache;
    }

    try {
        const snap = await getDocs(collection(db, COLLECTIONS.USUARIOS_SISTEMA));
        const usuarios = [];
        snap.forEach(d => {
            const data = d.data();
            usuarios.push({
                id: d.id,
                email: (data.email || '').trim().toLowerCase(),
                nombre: data.nombre || data.email?.split('@')[0] || 'Usuario Mandala',
                roles: Array.isArray(data.roles) ? data.roles : [data.rol || 'coordinador'],
                rol: data.rol || (Array.isArray(data.roles) && data.roles[0]) || 'coordinador',
                activo: data.activo !== false,
                modulos_habilitados: data.modulos_habilitados || []
            });
        });

        // Ordenar alfabéticamente por nombre
        usuarios.sort((a, b) => a.nombre.localeCompare(b.nombre));
        usuariosCache = usuarios;
        console.log(`[Mandala Usuarios] ${usuarios.length} usuarios cargados desde '${COLLECTIONS.USUARIOS_SISTEMA}'.`);
        return usuarios;
    } catch (error) {
        console.warn("[Mandala Usuarios] Error al leer 'usuarios_sistema' de Firestore:", error);
        return usuariosCache;
    }
}

/**
 * Obtener un usuario específico por su dirección de correo electrónico
 * @param {string} email 
 * @returns {Promise<Object|null>}
 */
export async function obtenerUsuarioPorEmail(email) {
    if (!email) return null;
    const emailNorm = email.trim().toLowerCase();

    // Buscar en caché si está disponible
    if (usuariosCache.length > 0) {
        const u = usuariosCache.find(x => x.email === emailNorm);
        if (u) return u;
    }

    // Si no está en caché o está vacía, refrescar desde Firestore
    const usuarios = await obtenerUsuariosSistemaFirestore(true);
    return usuarios.find(x => x.email === emailNorm) || null;
}
