# Configuración de Firebase - Pasos Necesarios

## Estado Actual
✅ Proyecto Firebase creado: `calculadora-yeast`
✅ Web App registrada
✅ Firestore habilitado
✅ Hosting configurado
⏳ **Autenticación Anónima: PENDIENTE**

---

## PASO CRÍTICO: Habilitar Autenticación Anónima

Sin esto, la app mostrará error: `Firebase: Error (auth/configuration-not-found)`

### Instrucciones:

1. Abre [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el proyecto: **calculadora-yeast**
3. En el menú izquierdo, ve a: **Compilación > Autenticación**
4. Si es la primera vez, haz clic en **Comenzar**
5. En la pestaña **Proveedores**, busca **Anónima**
6. Haz clic en el proveedor **Anónimo**
7. Habilita el botón toggle: **Habilitado** (debe quedar azul/On)
8. Haz clic en **Guardar**

✅ Listo. La autenticación anónima está habilitada.

---

## Verificación en App

Después de habilitar, prueba la app:
- Local: http://192.168.0.102:5173/
- Production: https://calculadora-yeast.web.app/

Si ves la interfaz de conteo de células sin errores en F12 → ¡Funciona!

---

## Configuración Adicional (Firestore Reglas)

**Reglas Firestore (Security Rules):**
Las reglas actuales permiten lectura/escritura solo a usuarios autenticados:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/sessions/{sessionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/history/{historyDoc} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Para aplicar estas reglas en Firebase Console:**
1. Ve a **Compilación > Firestore Database > Reglas**
2. Reemplaza el contenido actual con las reglas arriba
3. Haz clic en **Publicar**

---

## Colecciones Firestore Esperadas

Después de la primera sesión autenticada, se crearán automáticamente:

```
users/
  ├── {userId}/
      ├── sessions/
      │   └── current-session/
      │       ├── sampleId
      │       ├── volumes
      │       ├── counts
      │       ├── globalCounts
      │       ├── countingMode
      │       └── timestamp
      └── history/
          ├── {recordId1}/
          ├── {recordId2}/
          └── ...
```

---

## Solución de Problemas

**Error: "auth/configuration-not-found"**
→ La autenticación anónima NO está habilitada. Ve al PASO CRÍTICO arriba.

**Error: "Permission denied" en Firestore**
→ Las reglas de seguridad de Firestore no permiten escritura. Verifica las reglas.

**App muestra en blanco**
→ 1. Abre F12 (DevTools)
→ 2. Ve a Console
→ 3. Si hay error rojo, cópialo y reporta
→ 4. Si no hay errores, el tema está en carga - espera 3 segundos

**Pérdida de datos entre recargas**
→ Si `localStorage` no funciona, comprueba que el navegador NO está en privado/incógnito

---

## Resumen Checklist

- [ ] Habilitar Autenticación Anónima en Firebase Console
- [ ] Verificar app local carga sin errores de auth
- [ ] Configurar Firestore Security Rules (opcional pero recomendado)
- [ ] Probar guardar y recargar sesión
- [ ] Verificar historial persiste en Firestore

---

**Última actualización:** 2024-02-20
**Estado:** App lista para producción después de habilitar autenticación
