import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface SpeechContextType {
  isSpeaking: boolean;
  isAutoPlaying: boolean;
  currentText: string;
  narratorTitle: string;
  narratorSubtitle: string;
  playSpeech: (text: string, title?: string, subtitle?: string, onEnd?: () => void, volume?: number) => void;
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

  const cancelSpeechRef = useRef(false);

  const stopSpeech = useCallback(() => {
    cancelSpeechRef.current = true;
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
    const synth = window.speechSynthesis;
    
    if (isSpeaking || synth.speaking) {
      if (isPaused || synth.paused) {
        synth.resume();
        setIsPaused(false);
      } else {
        synth.pause();
        setIsPaused(true);
      }
    }
  }, [isSpeaking, isPaused]);

  const playSpeech = useCallback((text: string, title: string = "", subtitle: string = "", onEnd?: () => void, volume: number = 0.3) => {
    cancelSpeechRef.current = true;
    window.speechSynthesis.cancel();
    
    if (!text) return;
    
    cancelSpeechRef.current = false;
    setCurrentText(text);
    setNarratorTitle(title);
    setNarratorSubtitle(subtitle);
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const femaleKeywords = ['monica', 'helena', 'lucia', 'laura', 'google español', 'microsoft helena', 'premium'];
    
    let selectedVoice = voices.find(v => {
      const name = v.name.toLowerCase();
      return v.lang.startsWith('es') && femaleKeywords.some(key => name.includes(key));
    });

    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith('es'));
    }
    
    if (selectedVoice) utterance.voice = selectedVoice;
    
    utterance.rate = 0.90;
    utterance.pitch = 1.0;
    utterance.lang = 'es-ES';
    utterance.volume = volume;
    
    utterance.onstart = () => {
      if (!cancelSpeechRef.current) {
        setIsSpeaking(true);
        setIsPaused(false);
      }
    };

    utterance.onend = () => {
      if (!cancelSpeechRef.current) {
        setIsSpeaking(false);
        if (onEnd) onEnd();
      }
    };

    utterance.onerror = (event) => {
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        console.error('Speech synthesis error:', event);
      }
      setIsSpeaking(false);
    };
    
    speechRef.current = utterance;

    setTimeout(() => {
      if (!cancelSpeechRef.current) {
        window.speechSynthesis.speak(utterance);
      }
    }, 50);
  }, []);

  // Periodic visual/state sync tick
  useEffect(() => {
    const interval = setInterval(() => {
      const synth = window.speechSynthesis;
      if (isSpeaking && !synth.speaking && !synth.paused && !isPaused) {
        setIsSpeaking(false);
      }
      
      // Chrome bug fix: resume if speaking but paused by browser (15s limit)
      if (isSpeaking && !isPaused && synth.speaking && synth.paused) {
        synth.resume();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isSpeaking, isPaused]);

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
