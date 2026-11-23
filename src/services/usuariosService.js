// =======================================================================
// src/services/usuariosService.js — Servicio de Usuarios del Ecosistema Mandala
// Reutiliza y sincroniza con la colección 'usuarios_sistema' de Firestore
// =======================================================================

import { db, collection, getDocs, doc, updateDoc, query, where } from "../config/firebase.js";
import { COLLECTIONS, EMAIL_CUENTA_EMERGENCIA, ROL_SONIDISTA, ROL_PLANIFICADOR, ROLES_DOCENTE } from "../config/constants.js";

/**
 * Cache en memoria de usuarios del sistema
 */
let usuariosCache = [];

function mapearUsuarioSistema(d) {
    const data = d.data();
    return {
        id: d.id,
        email: (data.email || '').trim().toLowerCase(),
        nombre: data.nombre || data.email?.split('@')[0] || 'Usuario Mandala',
        roles: Array.isArray(data.roles) ? data.roles : [data.rol || 'coordinador'],
        rol: data.rol || (Array.isArray(data.roles) && data.roles[0]) || 'coordinador',
        activo: data.activo !== false,
        password_modificada: data.password_modificada,
        modulos_habilitados: data.modulos_habilitados || [],
        profesor_id: data.profesor_id || '',
        correo_calendario: (data.correo_calendario || '').trim().toLowerCase(),
        avisos_festival_pospuestos: data.avisos_festival_pospuestos || null
    };
}

/**
 * Lee 'usuarios_sistema' y lanza la excepción si Firestore falla
 */
async function leerUsuariosSistema() {
    const snap = await getDocs(collection(db, COLLECTIONS.USUARIOS_SISTEMA));
    const usuarios = [];
    snap.forEach(d => usuarios.push(mapearUsuarioSistema(d)));
    usuarios.sort((a, b) => a.nombre.localeCompare(b.nombre));
    usuariosCache = usuarios;
    return usuarios;
}

/**
 * Lee solo los documentos de 'usuarios_sistema' con ese email (en minúsculas).
 * Es lo único que pueden leer los sonidistas (no la colección entera).
 */
async function leerUsuariosPorEmail(emailNorm) {
    const snap = await getDocs(query(collection(db, COLLECTIONS.USUARIOS_SISTEMA), where('email', '==', emailNorm)));
    const usuarios = [];
    snap.forEach(d => usuarios.push(mapearUsuarioSistema(d)));
    return usuarios;
}

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
        const usuarios = await leerUsuariosSistema();
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
    if (usuariosCache.length > 0) {
        const u = usuariosCache.find(x => x.email === emailNorm);
        if (u) return u;
    }
    const usuarios = await obtenerUsuariosSistemaFirestore(true);
    return usuarios.find(x => x.email === emailNorm) || null;
}

/**
 * Decide si un correo autenticado puede usar la app.
 * Estados: 'ok' | 'sin_perfil' | 'inactivo' | 'sin_rol_festivales' | 'sin_permiso' | 'error'
 * Nunca asume acceso: sin perfil activo en usuarios_sistema, no se ingresa
 * (salvo la cuenta de emergencia, que entra siempre como admin).
 */
/** Roles que permiten usar Mandala Festivales: el administrador (acceso total) y el Gestor de Festivales */
export const ROLES_CON_ACCESO_FESTIVALES = ['admin', 'gestor_festivales'];

export function tieneAccesoFestivales(roles) {
    const lista = (Array.isArray(roles) ? roles : [roles]).map(r => String(r || '').toLowerCase().trim());
    return lista.some(r => ROLES_CON_ACCESO_FESTIVALES.includes(r));
}

/** Quien tiene el rol de sonidista (puede tenerlo además de otros) */
export function tieneRolSonidista(roles) {
    const lista = (Array.isArray(roles) ? roles : [roles]).map(r => String(r || '').toLowerCase().trim());
    return lista.includes(ROL_SONIDISTA);
}

/** Planificador de clases (v2.11): puede tenerlo además de otros roles */
export function tieneRolPlanificador(roles) {
    const lista = (Array.isArray(roles) ? roles : [roles]).map(r => String(r || '').toLowerCase().trim());
    return lista.includes(ROL_PLANIFICADOR);
}

/** Docente (docente, profesor o evaluador, como en Admisión) */
export function tieneRolDocente(roles) {
    const lista = (Array.isArray(roles) ? roles : [roles]).map(r => String(r || '').toLowerCase().trim());
    return lista.some(r => ROLES_DOCENTE.includes(r));
}

/**
 * Usuarios activos con rol docente, para el bloque "Docentes del evento".
 * Se unen los documentos repetidos de un mismo email (se queda con el que tiene profesor_id).
 */
export async function obtenerDocentesActivos() {
    const usuarios = await obtenerUsuariosSistemaFirestore(usuariosCache.length === 0);
    const porEmail = new Map();
    usuarios.filter(u => u.activo !== false && u.email).forEach(u => {
        const prev = porEmail.get(u.email);
        if (!prev) { porEmail.set(u.email, { ...u }); return; }
        const roles = [...new Set([...(prev.roles || []), ...(u.roles || [])])];
        const mejor = (!prev.profesor_id && u.profesor_id) ? { ...u } : prev;
        porEmail.set(u.email, { ...mejor, roles });
    });
    // Docente = rol docente/profesor/evaluador o ficha docente vinculada (profesor_id), como en Admisión
    return [...porEmail.values()].filter(u => tieneRolDocente(u.roles) || Boolean(u.profesor_id))
        .map(u => ({ ...u, recibeAvisos: tieneAccesoFestivales(u.roles) }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function consultarAccesoUsuario(email) {
    const emailNorm = (email || '').trim().toLowerCase();
    const esEmergencia = emailNorm === EMAIL_CUENTA_EMERGENCIA;
    const perfilEmergencia = { id: null, email: emailNorm, nombre: 'Administración', rol: 'admin', roles: ['admin'], activo: true, esEmergencia: true, esAdmin: true, tieneGestion: true, esPlanificador: false, esDocente: false };

    try {
        let usuarios;
        try {
            usuarios = await leerUsuariosSistema();
        } catch (errLectura) {
            // Los sonidistas no pueden leer la colección entera (solo su propio documento): se busca por email
            if (errLectura && errLectura.code === 'permission-denied') usuarios = await leerUsuariosPorEmail(emailNorm);
            else throw errLectura;
        }
        // Puede haber varios documentos con el mismo email (altas duplicadas o dadas de baja):
        // alcanza con que haya uno activo, y se unen los roles de todos los activos.
        const coincidencias = usuarios.filter(x => x.email === emailNorm);
        if (coincidencias.length === 0) {
            return esEmergencia ? { estado: 'ok', perfil: perfilEmergencia } : { estado: 'sin_perfil', perfil: null };
        }
        const activos = coincidencias.filter(x => x.activo !== false);
        if (activos.length === 0) return { estado: 'inactivo', perfil: coincidencias[0] };
        const roles = [...new Set(activos.flatMap(x => x.roles))];
        // Con duplicados, se prefiere el documento con perfil docente (profesor_id)
        const base = activos.find(x => x.profesor_id) || activos[0];
        const perfil = {
            ...base,
            roles,
            esAdmin: roles.map(r => String(r).toLowerCase()).includes('admin') || esEmergencia,
            tieneGestion: tieneAccesoFestivales(roles) || esEmergencia,
            esPlanificador: tieneRolPlanificador(roles),
            esDocente: tieneRolDocente(roles) || Boolean(base.profesor_id)
        };
        // Entran los administradores y los Gestores de Festivales (acceso completo), los planificadores de clases
        // (acceso reducido: eventos en solo lectura y Planificación) y los sonidistas (acceso reducido)
        if (perfil.tieneGestion) return { estado: 'ok', perfil };
        if (perfil.esPlanificador) return { estado: 'ok', perfil: { ...perfil, esSoloPlanificador: true } };
        if (tieneRolSonidista(roles)) return { estado: 'ok', perfil: { ...perfil, esSoloSonidista: true } };
        return { estado: 'sin_rol_festivales', perfil };
    } catch (error) {
        console.warn("[Mandala Usuarios] No se pudo verificar el acceso:", error.code || error);
        if (esEmergencia) return { estado: 'ok', perfil: perfilEmergencia };
        if (error && error.code === 'permission-denied') return { estado: 'sin_permiso', perfil: null };
        return { estado: 'error', perfil: null };
    }
}

/**
 * Marca en Firestore que el usuario ya cambió su clave inicial
 */
export async function marcarPasswordModificada(usuarioId) {
    if (!usuarioId) return false;
    try {
        await updateDoc(doc(db, COLLECTIONS.USUARIOS_SISTEMA, usuarioId), {
            password_modificada: true,
            fecha_modificacion_password: new Date().toISOString()
        });
        const u = usuariosCache.find(x => x.id === usuarioId);
        if (u) u.password_modificada = true;
        return true;
    } catch (error) {
        console.warn("[Mandala Usuarios] No se pudo registrar el cambio de contraseña:", error.code || error);
        return false;
    }
}
