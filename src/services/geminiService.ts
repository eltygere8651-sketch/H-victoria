import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const generateSlideExplanation = async (slideTitle: string, slideSubtitle: string, slideContent: string, slidePoints: string[]) => {
  try {
    const isFirstSlide = slideTitle.toLowerCase().includes("herramienta");
    const isLastSlide = slideTitle.toLowerCase().includes("equipo") || 
                       slideTitle.toLowerCase().includes("bienvenido");
    
    const prompt = `
      Eres un compañero experto en el uso de la aplicación "Hub". Tu objetivo es enseñar a otro compañero a usar la aplicación de la forma más sencilla posible, sin palabras técnicas complicadas.
      
      DATOS DE LO QUE TIENES QUE EXPLICAR:
      - Título: ${slideTitle}
      - Subtítulo: ${slideSubtitle}
      - Qué es: ${slideContent}
      - Qué hace: ${slidePoints.join(', ')}
      
      REGLAS PARA TU DISCURSO:
      1. HABLA CLARO Y SIMPLE: Usa un lenguaje que cualquiera entienda. Evita palabras como "estratégico", "optimización", "ecosistema" o "trazabilidad". 
      2. VE AL GRANO: Explica para qué sirve esto en el día a día. ¿Cómo le va a ahorrar tiempo al empleado? ¿Cómo le quita el estrés de usar papel?
      3. TONO CERCANO: Habla como si estuvieras tomándote un café con un compañero. Sé amable, directo y práctico.
      4. CONTEXTO: 
         - ${isFirstSlide ? 'Saluda al equipo y diles que Hub les va a hacer la vida más fácil.' : ''}
         - ${isLastSlide ? 'Diles que ya están listos y que, si tienen dudas, pregunten a cualquiera del equipo.' : ''}
      5. DURACIÓN: Aproximadamente 40-50 segundos de lectura. No te enrolles.
      6. PASO A PASO: Di cosas como "Pulsa aquí", "Mira esto", "Así de fácil".

      IMPORTANTE: Responde ÚNICAMENTE con el texto que debe decir la voz. No pongas títulos ni introducciones.
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
