import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface SpeechContextType {
  isSpeaking: boolean;
  isAutoPlaying: boolean;
  currentText: string;
  narratorTitle: string;
  narratorSubtitle: string;
  playSpeech: (text: string, title?: string, subtitle?: string, onEnd?: () => void) => void;
  stopSpeech: () => void;
  togglePause: () => void;
  isPaused: boolean;
}

const SpeechContext = createContext<SpeechContextType | undefined>(undefined);

export const SpeechProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [narratorTitle, setNarratorTitle] = useState("");
  const [narratorSubtitle, setNarratorSubtitle] = useState("");
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopSpeech = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentText("");
    setNarratorTitle("");
    setNarratorSubtitle("");
    if (speechRef.current) {
      speechRef.current.onend = null;
      speechRef.current = null;
    }
  }, []);

  const togglePause = useCallback(() => {
    if (window.speechSynthesis.speaking) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    }
  }, []);

  const playSpeech = useCallback((text: string, title: string = "", subtitle: string = "", onEnd?: () => void) => {
    // We only stop if there's nothing playing or if it's a new context
    // But for simplicity, we'll stop and restart as before, but the state persists globally
    window.speechSynthesis.cancel();
    
    if (!text) return;
    
    setCurrentText(text);
    setNarratorTitle(title);
    setNarratorSubtitle(subtitle);
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Voice selection
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => v.lang.startsWith('es') && (v.name.includes('Google') || v.name.includes('Premium'))) 
                       || voices.find(v => v.lang.startsWith('es'));
    
    if (spanishVoice) utterance.voice = spanishVoice;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.lang = 'es-ES';
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
    };
    
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [stopSpeech]);

  return (
    <SpeechContext.Provider value={{
      isSpeaking,
      isAutoPlaying,
      currentText,
      narratorTitle,
      narratorSubtitle,
      playSpeech,
      stopSpeech,
      togglePause,
      isPaused
    }}>
      {children}
    </SpeechContext.Provider>
  );
};

export const useSpeech = () => {
  const context = useContext(SpeechContext);
  if (context === undefined) {
    throw new Error('useSpeech must be used within a SpeechProvider');
  }
  return context;
};
