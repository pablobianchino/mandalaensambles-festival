// =======================================================================
// src/services/sonidistasService.js — Directorio de sonidistas y sus usuarios de acceso
//
// Cada sonidista tiene:
//  - un documento en `sonidistas` (nombre, apellido, teléfono, email, activo), que es lo que se ve en la tabla;
//  - un usuario en `usuarios_sistema` con el rol `sonidista_festivales` y una cuenta de Firebase Auth con la clave inicial;
//  - su email dentro de `acceso/lista.sonidistas` (lista aparte: NO entra en `emails`, que da lectura de alumnos).
//
// Limitación de Firebase: una página web no puede borrar la cuenta de acceso de otra persona. Al quitar a un sonidista se
// borra su usuario (y su email sale de la lista), así que no puede entrar ni leer nada; la cuenta de Firebase Auth queda
// "huérfana" e inofensiva. Si más adelante se vuelve a cargar el mismo email, entra con la última clave que usó.
// =======================================================================

import {
    db, collection, getDocs, doc, setDoc, addDoc, updateDoc, deleteDoc,
    initializeApp, getAuth, createUserWithEmailAndPassword, signOut
} from "../config/firebase.js";
import { COLLECTIONS, ROL_SONIDISTA, CLAVE_INICIAL_DEFECTO, firebaseConfig } from "../config/constants.js";
import { notificarErrorPersistencia } from "../utils/errores.js";

function normalizarEmail(e) {
    return String(e || '').trim().toLowerCase();
}

function rolesDeDoc(data) {
    return Array.isArray(data.roles) && data.roles.length > 0 ? data.roles : (data.rol ? [data.rol] : []);
}

export async function obtenerSonidistasFirestore() {
    try {
        const snap = await getDocs(collection(db, COLLECTIONS.SONIDISTAS));
        const lista = [];
        snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
        lista.sort((a, b) => `${a.apellido || ''} ${a.nombre || ''}`.localeCompare(`${b.apellido || ''} ${b.nombre || ''}`));
        return lista;
    } catch (err) {
        console.warn("[Mandala Festivales] Error al cargar sonidistas:", err);
        return [];
    }
}

/** Guarda nombre, apellido y teléfono (el email no se cambia: es el usuario de acceso). Devuelve true/false. */
export async function guardarDatosSonidistaFirestore(sonidista, data) {
    try {
        await setDoc(doc(db, COLLECTIONS.SONIDISTAS, sonidista.id), { ...data, actualizadoEn: new Date().toISOString() }, { merge: true });
        // El nombre también se refleja en su usuario (si es solo de sonidista)
        if (sonidista.usuarioId && sonidista.usuarioExclusivo && (data.nombre !== undefined || data.apellido !== undefined)) {
            const nombreCompleto = `${data.nombre !== undefined ? data.nombre : (sonidista.nombre || '')} ${data.apellido !== undefined ? data.apellido : (sonidista.apellido || '')}`.trim();
            if (nombreCompleto) await updateDoc(doc(db, COLLECTIONS.USUARIOS_SISTEMA, sonidista.usuarioId), { nombre: nombreCompleto, fecha_actualizacion: new Date().toISOString() }).catch(() => {});
        }
        return true;
    } catch (err) {
        console.error(`[Mandala Festivales] Error al guardar el sonidista ${sonidista.id}:`, err);
        notificarErrorPersistencia("el sonidista", err);
        return false;
    }
}

/**
 * Reescribe acceso/lista.sonidistas con los emails de los usuarios activos que tienen el rol de sonidista.
 * Solo toca ese campo (las reglas dejan a los gestores modificar únicamente `sonidistas`).
 */
export async function sincronizarListaSonidistas() {
    const snap = await getDocs(collection(db, COLLECTIONS.USUARIOS_SISTEMA));
    const emails = new Set();
    snap.forEach(d => {
        const u = d.data();
        const e = normalizarEmail(u.email);
        if (!e || u.activo === false) return;
        if (rolesDeDoc(u).includes(ROL_SONIDISTA)) emails.add(e);
    });
    await updateDoc(doc(db, COLLECTIONS.ACCESO, 'lista'), {
        sonidistas: [...emails].sort(),
        actualizadoSonidistas: new Date().toISOString()
    });
    return emails.size;
}

/**
 * Da de alta a un sonidista: directorio + usuario + cuenta de acceso + lista.
 * @param {{nombre, apellido, telefono, email}} datos
 * @param {boolean} esAdmin - los gestores no pueden tocar usuarios que no sean solo sonidistas
 * @returns {Promise<{ok:boolean, motivo?:string, mensaje?:string, claveInicial?:string|null, cuentaExistente?:boolean, usuarioNuevo?:boolean}>}
 */
export async function altaSonidistaFirestore(datos, esAdmin) {
    const email = normalizarEmail(datos.email);
    const nombre = String(datos.nombre || '').trim();
    const apellido = String(datos.apellido || '').trim();
    const telefono = String(datos.telefono || '').trim();
    if (!nombre || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return { ok: false, motivo: 'datos', mensaje: 'Completá el nombre y un email válido.' };
    }
    try {
        const sSnap = await getDocs(collection(db, COLLECTIONS.SONIDISTAS));
        if (sSnap.docs.some(d => normalizarEmail(d.data().email) === email)) {
            return { ok: false, motivo: 'duplicado', mensaje: 'Ya hay un sonidista cargado con ese email.' };
        }

        const uSnap = await getDocs(collection(db, COLLECTIONS.USUARIOS_SISTEMA));
        const existente = uSnap.docs.find(d => normalizarEmail(d.data().email) === email);
        let usuarioId = null;
        let usuarioNuevo = false;
        let cuentaExistente = false;

        if (existente) {
            const roles = rolesDeDoc(existente.data());
            usuarioId = existente.id;
            if (!roles.includes(ROL_SONIDISTA)) {
                if (!esAdmin) {
                    return { ok: false, motivo: 'requiere_admin', mensaje: 'Ese email ya pertenece a otro usuario de Mandala. Para sumarle el rol de sonidista pedile a un administrador.' };
                }
                await updateDoc(doc(db, COLLECTIONS.USUARIOS_SISTEMA, existente.id), { roles: [...roles, ROL_SONIDISTA], fecha_actualizacion: new Date().toISOString() });
            }
            cuentaExistente = true;
        } else {
            const nuevo = await addDoc(collection(db, COLLECTIONS.USUARIOS_SISTEMA), {
                email,
                nombre: `${nombre} ${apellido}`.trim(),
                rol: ROL_SONIDISTA,
                roles: [ROL_SONIDISTA],
                activo: true,
                modulos_habilitados: [],
                password_modificada: false,
                password_inicial_asignada: true,
                auth_email: email,
                auth_cuenta_creada: true,
                fecha_creacion: new Date().toISOString()
            });
            usuarioId = nuevo.id;
            usuarioNuevo = true;
            // Cuenta de acceso con la clave inicial, en una app secundaria para no cerrar la sesión de quien la crea
            try {
                const secApp = initializeApp(firebaseConfig, `Sonidista_Provision_${Date.now()}`);
                const secAuth = getAuth(secApp);
                await createUserWithEmailAndPassword(secAuth, email, CLAVE_INICIAL_DEFECTO);
                await signOut(secAuth);
            } catch (secErr) {
                if (secErr && secErr.code === 'auth/email-already-in-use') cuentaExistente = true; // ya tenía cuenta: conserva su clave
                else console.warn("[Mandala Festivales] Aviso al crear la cuenta de acceso del sonidista:", secErr && (secErr.code || secErr.message));
            }
        }

        const ref = doc(collection(db, COLLECTIONS.SONIDISTAS));
        await setDoc(ref, {
            nombre, apellido, telefono, email,
            activo: true,
            usuarioId,
            usuarioExclusivo: usuarioNuevo,
            actualizadoEn: new Date().toISOString()
        });
        await sincronizarListaSonidistas();
        return { ok: true, id: ref.id, usuarioNuevo, cuentaExistente, claveInicial: (usuarioNuevo && !cuentaExistente) ? CLAVE_INICIAL_DEFECTO : null };
    } catch (err) {
        console.error("[Mandala Festivales] Error al dar de alta al sonidista:", err);
        notificarErrorPersistencia("el alta del sonidista", err);
        return { ok: false, motivo: 'error', mensaje: 'No se pudo dar de alta al sonidista. Revisá la conexión y los permisos.' };
    }
}

/** Activa o bloquea el acceso. Bloquear apaga su usuario (si es solo sonidista) y lo saca de la lista de acceso. */
export async function cambiarActivoSonidistaFirestore(sonidista, activo) {
    try {
        await updateDoc(doc(db, COLLECTIONS.SONIDISTAS, sonidista.id), { activo: !!activo, actualizadoEn: new Date().toISOString() });
        if (sonidista.usuarioId && sonidista.usuarioExclusivo) {
            await updateDoc(doc(db, COLLECTIONS.USUARIOS_SISTEMA, sonidista.usuarioId), { activo: !!activo, fecha_actualizacion: new Date().toISOString() });
        }
        await sincronizarListaSonidistas();
        return true;
    } catch (err) {
        console.error("[Mandala Festivales] Error al cambiar el estado del sonidista:", err);
        notificarErrorPersistencia("el estado del sonidista", err);
        return false;
    }
}

/**
 * Quita al sonidista: borra su ficha y le saca el acceso. Si su usuario era solo de sonidista se borra; si tenía otros roles
 * se le saca únicamente el de sonidista (solo un administrador puede hacerlo).
 * @returns {Promise<{ok:boolean, motivo?:string, mensaje?:string}>}
 */
export async function quitarSonidistaFirestore(sonidista, esAdmin) {
    try {
        if (sonidista.usuarioId && !sonidista.usuarioExclusivo && !esAdmin) {
            return { ok: false, motivo: 'requiere_admin', mensaje: 'Este usuario también tiene otros roles en Mandala. Pedile a un administrador que le saque el rol de sonidista.' };
        }
        if (sonidista.usuarioId) {
            if (sonidista.usuarioExclusivo) {
                await deleteDoc(doc(db, COLLECTIONS.USUARIOS_SISTEMA, sonidista.usuarioId));
            } else {
                const uSnap = await getDocs(collection(db, COLLECTIONS.USUARIOS_SISTEMA));
                const u = uSnap.docs.find(d => d.id === sonidista.usuarioId);
                if (u) {
                    const roles = rolesDeDoc(u.data()).filter(r => r !== ROL_SONIDISTA);
                    await updateDoc(doc(db, COLLECTIONS.USUARIOS_SISTEMA, u.id), { roles, fecha_actualizacion: new Date().toISOString() });
                }
            }
        }
        await deleteDoc(doc(db, COLLECTIONS.SONIDISTAS, sonidista.id));
        await sincronizarListaSonidistas();
        return { ok: true };
    } catch (err) {
        console.error("[Mandala Festivales] Error al quitar al sonidista:", err);
        notificarErrorPersistencia("la baja del sonidista", err);
        return { ok: false, motivo: 'error', mensaje: 'No se pudo quitar al sonidista. Revisá la conexión y los permisos.' };
    }
}
