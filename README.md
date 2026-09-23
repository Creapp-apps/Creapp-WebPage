# ⚡ CreAPP — Official Platform & Innovation Hub

<div align="center">

<img width="100%" alt="CreAPP Banner" src="https://raw.githubusercontent.com/Creapp-apps/Creapp-apps/main/assets/creapp-banner.png" />

[![Website](https://img.shields.io/badge/Live_Site-creapp--web--page.vercel.app-00DC82?style=for-the-badge&logo=vercel&logoColor=white)](https://creapp-web-page.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-3D_Visuals-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Google GenAI](https://img.shields.io/badge/AI_Engine-Google_GenAI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Remotion](https://img.shields.io/badge/Video_Engine-Remotion-red?style=for-the-badge&logo=remotion&logoColor=white)](https://www.remotion.dev/)

**Plataforma oficial y escaparate interactivo de ingeniería de software de CreAPP: experiencias web 3D inmersivas, generador interactivo de propuestas comerciales en PDF, motor de video generativo y arquitectura cloud.**

[Visitar Sitio en Producción](https://creapp-web-page.vercel.app) • [Reportar un Issue](https://github.com/Creapp-apps/Creapp-WebPage/issues)

</div>

---

## 🌟 Acerca de CreAPP Hub

Este repositorio alberga la plataforma corporativa e interactiva de **CreAPP Software Lab**. Diseñada como un escaparate de vanguardia tecnológica, combina diseño visual de última generación, renderizado 3D en tiempo real con WebGL, animaciones kinéticas guiadas por scroll suave y herramientas interactivas de ingeniería de software para clientes corporativos.

---

## 🚀 Capacidades y Módulos de Vanguardia

### 🎨 1. Experiencia Visual Inmersiva & 3D WebGL
* **Escenas 3D Interactivas:** Integración de `@react-three/fiber` y `@react-three/drei` con sombreadores dinámicos, postprocesamiento cinematográfico y respuesta a eventos del cursor.
* **Scroll Cinematográfico Suave:** Implementación de `Lenis Scroll` coordinado con líneas de tiempo de `GSAP` y `Framer Motion` para una navegación sin fricción.

### 📄 2. Editor & Generador de Propuestas Comerciales en PDF
* **Proposal Editor Integrado:** Entorno administrativo para redactar y personalizar cotizaciones de software con cálculo dinámico de presupuestos, cronogramas y firmas digitales (`react-signature-canvas`).
* **Renderizado Vectorial a PDF:** Exportación de alta precisión a PDF mediante `jspdf` y `html2canvas-pro` con maquetación tipográfica profesional.

### 🎬 3. Motor de Animación de Video en Código (`@remotion/player`)
* **Walkthroughs Programáticos:** Generación de videos y animaciones dinámicas generadas 100% en React y renderizadas en el cliente.

### 🤖 4. Integración con Google Gemini (GenAI)
* **Inteligencia Aumentada:** Asistente interactivo integrado con `@google/genai` para consultas sobre servicios, diagnóstico de requerimientos técnicos y estimación de alcances de proyectos.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías | Propósito |
| :--- | :--- | :--- |
| **Frontend Framework** | `React` + `TypeScript` + `Vite` | Desarrollo ágil, HMR instantáneo y empaquetado optimizado. |
| **3D & Shaders** | `Three.js` + `@react-three/fiber` + `@react-three/drei` | Entornos tridimensionales interactivos en WebGL. |
| **Motion & Scroll** | `GSAP` + `Framer Motion` + `Lenis` | Coreografía de animaciones kinéticas y scroll inercial. |
| **Video Programático** | `@remotion/player` | Renderizado de animaciones de video en React. |
| **Base de Datos** | `Supabase` (PostgreSQL) | Almacenamiento de propuestas, formularios de contacto y logs. |
| **IA Generativa** | `@google/genai` (Gemini API) | Asistente de laboratorio y copiloto de cotizaciones. |
| **Documentos** | `jspdf` + `html2canvas-pro` | Generación de PDFs ejecutivos listos para imprimir. |

---

## 💻 Instalación y Desarrollo Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/Creapp-apps/Creapp-WebPage.git
cd Creapp-WebPage
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto:
```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
VITE_GEMINI_API_KEY=tu_gemini_api_key
```

### 4. Iniciar el entorno de desarrollo
```bash
npm run dev
```

---

<div align="center">
<sub>Diseñado y construido con obsesión por el detalle por <b>CreAPP Software Lab</b> © 2026</sub>
</div>
