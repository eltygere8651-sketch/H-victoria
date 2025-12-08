# Hub - Sistema de Gestión Operativa

Este proyecto es una aplicación web completa construida con React, TypeScript y Firebase, diseñada para la gestión de inventario, pedidos, tareas y usuarios en un entorno operativo.

## Características

- **Autenticación Segura:** Sistema de inicio de sesión basado en roles (Admin, Staff).
- **Gestión de Inventario:** Control de stock en tiempo real, con alertas de umbral mínimo.
- **Sistema de Pedidos:** Flujo de trabajo para solicitar productos del inventario por departamento.
- **Gestión de Tareas y Anuncios:** Asignación y seguimiento de tareas con prioridades, estados, imágenes y comentarios.
- **Panel de Administración:** Visualización de reportes, historial de pedidos y gestión de usuarios.
- **Notificaciones en Tiempo Real:** Alertas push y en la app para eventos importantes.
- **Soporte Offline:** Gracias a la persistencia de Firestore, la aplicación sigue funcionando sin conexión.
- **Diseño Responsivo (PWA):** Interfaz moderna y adaptable a cualquier dispositivo, con capacidad de ser instalada en el escritorio o móvil.

---

## Despliegue en Vercel (Recomendado)

La forma más sencilla de desplegar esta aplicación es a través de Vercel.

### Paso 1: Sube tu código a GitHub

Crea un repositorio en GitHub y sube todos los archivos de este proyecto.

### Paso 2: Crea un proyecto en Vercel

1.  Regístrate o inicia sesión en [Vercel](https://vercel.com).
2.  Haz clic en "Add New... -> Project".
3.  Importa el repositorio de GitHub que acabas de crear.
4.  Vercel detectará automáticamente que es un proyecto Vite y configurará los comandos de build (`npm run build`) y el directorio de salida (`dist`) por ti.

### Paso 3: Configura las Variables de Entorno

Esta es la parte más importante. En la configuración de tu proyecto en Vercel, ve a la pestaña **Settings -> Environment Variables**.

Copia el contenido del archivo `.env.example` de este proyecto y crea una variable por cada una de las claves.

`VITE_FIREBASE_API_KEY`=`AIza...`
`VITE_FIREBASE_AUTH_DOMAIN`=`your-project.firebaseapp.com`
`VITE_FIREBASE_PROJECT_ID`=`your-project-id`
`VITE_FIREBASE_STORAGE_BUCKET`=`your-project.appspot.com`
`VITE_FIREBASE_MESSAGING_SENDER_ID`=`your-sender-id`
`VITE_FIREBASE_APP_ID`=`your-app-id`
`VITE_FCM_VAPID_KEY`=`your-vapid-key`

**Importante:** Asegúrate de que los valores que pegues aquí sean los de tu propio proyecto de Firebase.

### Paso 4: Despliega

Una vez guardadas las variables, ve a la pestaña "Deployments" y lanza un nuevo despliegue (o re-despliega el último). Vercel construirá tu aplicación usando las claves que proporcionaste y la publicará en una URL.

---

## Desarrollo Local

Si deseas ejecutar la aplicación en tu máquina local:

### Prerrequisitos

- Node.js (v18 o superior)
- npm

### Pasos

1.  **Clona el repositorio:**
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd <NOMBRE_DEL_DIRECTORIO>
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```

3.  **Crea tu archivo de entorno:**
    -   Copia el archivo `.env.example` y renómbralo a `.env.local`.
    -   Rellena el archivo `.env.local` con tus propias claves de API de Firebase.

4.  **Ejecuta el servidor de desarrollo:**
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:5173` (o el puerto que indique la consola).
