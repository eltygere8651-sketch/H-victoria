import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const generateSlideExplanation = async (slideTitle: string, slideSubtitle: string, slideContent: string, slidePoints: string[]) => {
  try {
    const isFirstSlide = slideTitle.toLowerCase().includes("ecosistema");
    const isLastSlide = slideTitle.toLowerCase().includes("gracias") || 
                       slideTitle.toLowerCase().includes("atención") || 
                       slideTitle.toLowerCase().includes("futuro") ||
                       slideTitle.toLowerCase().includes("excelencia");
    
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
      3. CONTEXTO: 
         - ${isFirstSlide ? 'Saluda al "equipo del Hotel Victoria" al inicio.' : 'NO menciones al "equipo del Hotel Victoria" a menos que sea el final.'}
         - ${isLastSlide ? 'Agradece la asistencia a la formación y anima al equipo a utilizar la plataforma para alcanzar nuevos niveles de eficiencia. Menciona que el soporte técnico está disponible para cualquier consulta.' : ''}
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

export const generateSpeech = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Lee este texto de formación profesional con un tono cercano, humano, pausado y motivador: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // 'Kore' is generally a very professional and clear voice
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("Error generating speech with Gemini TTS:", error);
    return null;
  }
};
