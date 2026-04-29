# Hub - Sistema de Gestión Operativa

Este proyecto es una aplicación web completa construida con React, TypeScript y Firebase, diseñada para la gestión de inventario, pedidos, tareas y usuarios en un entorno operativo.

## Estructura del Proyecto

El código fuente activo se encuentra exclusivamente en la carpeta `src/`. Los archivos en la raíz son principalmente de configuración.

## Comandos Disponibles

### Limpieza de Archivos Obsoletos
Si ves archivos duplicados en la raíz (como `App.tsx` o carpetas `pages/` fuera de `src`), ejecuta:
```bash
npm run clean
```

### Desarrollo Local

1.  **Instala las dependencias:**
    ```bash
    npm install
    ```

2.  **Ejecuta el servidor de desarrollo:**
    ```bash
    npm run dev
    ```

3.  **Construir para producción:**
    ```bash
    npm run build
    ```

## Características

- **Autenticación Segura:** Sistema de inicio de sesión basado en roles (Admin, Staff).
- **Gestión de Inventario:** Control de almacén en tiempo real, con alertas de umbral mínimo.
- **Sistema de Pedidos:** Flujo de trabajo para solicitar productos del inventario por departamento.
- **Gestión de Tareas y Anuncios:** Asignación y seguimiento de tareas con prioridades, estados, imágenes y comentarios.
- **Panel de Administración:** Visualización de reportes, historial de pedidos y gestión de usuarios.
- **Notificaciones en Tiempo Real:** Alertas push y en la app para eventos importantes.
- **Soporte Offline:** Gracias a la persistencia de Firestore, la aplicación sigue funcionando sin conexión.
- **Diseño Responsivo (PWA):** Interfaz moderna y adaptable a cualquier dispositivo.

## Configuración

Asegúrate de configurar tus variables de entorno en un archivo `.env` o en el panel de tu proveedor de hosting (Vercel/Netlify) utilizando las claves definidas en `src/firebaseCredentials.ts` o `.env.example`.
