import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const generateSlideExplanation = async (slideTitle: string, slideSubtitle: string, slideContent: string, slidePoints: string[]) => {
  try {
    const isFirstSlide = slideTitle.toLowerCase().includes("ecosistema");
    
    const prompt = `
      Eres un Senior Operations Consultant especializado en hospitalidad de lujo. 
      Tu misión es realizar un análisis estratégico de alto nivel para una diapositiva de la plataforma "Hub".
      
      DATOS DE LA DIAPOSITIVA:
      - Título: ${slideTitle}
      - Subtítulo: ${slideSubtitle}
      - Concepto: ${slideContent}
      - Funcionalidades: ${slidePoints.join(', ')}
      
      DIRECTRICES ESTRATÉGICAS:
      1. RAZONAMIENTO PROFUNDO: No describas las funciones, explica el IMPACTO. ¿Cómo reduce esto el error humano? ¿Cómo optimiza el tiempo del personal para que puedan centrarse en el huésped? ¿Cómo protege la rentabilidad del hotel?
      2. TONO EJECUTIVO: Usa un lenguaje sofisticado pero accesible. Evita muletillas. Sé inspirador y autoritario.
      3. SIN REPETICIONES: ${isFirstSlide ? 'Puedes saludar al "equipo del Hotel Victoria" al inicio.' : 'NO menciones al "equipo del Hotel Victoria", ya los saludamos antes. Ve directo al grano.'}
      4. FLUIDEZ: El texto será leído por una voz sintética. Usa frases con buen ritmo y pausas naturales.
      5. DURACIÓN: Aproximadamente 50-70 segundos de lectura (120-160 palabras).
      6. ESTRUCTURA: 
         - Gancho estratégico (por qué este tema importa hoy).
         - Análisis de valor (el "por qué" detrás de las funciones).
         - Visión de futuro (cómo esto transforma el día a día).

      IMPORTANTE: Responde ÚNICAMENTE con el texto de la locución.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Error generating AI explanation:", error);
    return "";
  }
};
