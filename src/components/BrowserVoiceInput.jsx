import React, { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import {
  browserSpeechSupported,
  createBrowserSpeechRecognition,
} from "../lib/BrowserWebSpeech";

export default function BrowserVoiceInput({ onTranscript, onListeningChange, disabled = false }) {
  const recognitionRef = useRef(null);
  const sessionActiveRef = useRef(false);
  const restartTimerRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => () => {
    sessionActiveRef.current = false;
    window.clearTimeout(restartTimerRef.current);
    recognitionRef.current?.abort();
  }, []);

  if (!browserSpeechSupported) return null;

  const stopListening = () => {
    sessionActiveRef.current = false;
    window.clearTimeout(restartTimerRef.current);
    recognitionRef.current?.stop();
    setIsListening(false);
    onListeningChange?.(false);
  };

  const startListening = () => {
    if (disabled || isListening) return;
    sessionActiveRef.current = true;
    setError("");
    setInterimText("");
    const recognition = createBrowserSpeechRecognition({
      onStart: () => { setIsListening(true); onListeningChange?.(true); },
      onInterim: setInterimText,
      onFinal: (text) => onTranscript?.(text),
      onError: (code) => {
        setIsListening(false);
        onListeningChange?.(false);
        setInterimText("");
        setError(
          code === "not-allowed"
            ? "Microphone permission was denied."
            : "Voice input could not be started."
        );
      },
      onEnd: () => {
        setInterimText("");
        if (!sessionActiveRef.current) {
          setIsListening(false);
          onListeningChange?.(false);
          return;
        }
        restartTimerRef.current = window.setTimeout(() => {
          if (!sessionActiveRef.current) return;
          try {
            recognition.start();
          } catch {
            restartTimerRef.current = window.setTimeout(() => {
              if (sessionActiveRef.current) recognition.start();
            }, 250);
          }
        }, 120);
      },
    });
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      sessionActiveRef.current = false;
      setIsListening(false);
      onListeningChange?.(false);
      setError("Voice input is already active.");
    }
  };

  return (
    <div className="browser-voice-input">
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        aria-label={isListening ? "Stop voice input" : "Start voice input"}
        title={isListening ? "Stop voice input" : "Speak your message"}
        className={isListening ? "is-listening" : ""}
      >
        {isListening ? <Square size={14} fill="currentColor" /> : <Mic size={17} />}
      </button>
      {(interimText || error) && (
        <span role={error ? "alert" : undefined}>{error || interimText}</span>
      )}
    </div>
  );
}
