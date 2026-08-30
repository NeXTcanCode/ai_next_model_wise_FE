import React, { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import {
  browserSpeechSupported,
  createBrowserSpeechRecognition,
} from "../lib/BrowserWebSpeech";

export default function BrowserVoiceInput({
  onTranscript,
  onListeningChange,
  disabled = false,
}) {
  const recognitionRef = useRef(null);
  const sessionActiveRef = useRef(false);
  const restartTimerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const notificationDismissedRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState("");
  const [showSilenceNotice, setShowSilenceNotice] = useState(false);

  useEffect(
    () => () => {
      sessionActiveRef.current = false;
      window.clearTimeout(restartTimerRef.current);
      window.clearTimeout(silenceTimerRef.current);
      recognitionRef.current?.abort();
    },
    []
  );

  if (!browserSpeechSupported) return null;

  const stopListening = () => {
    sessionActiveRef.current = false;
    window.clearTimeout(restartTimerRef.current);
    window.clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
    setIsListening(false);
    onListeningChange?.(false);
  };

  const resetSilenceTimer = () => {
    window.clearTimeout(silenceTimerRef.current);
    setShowSilenceNotice(false);
    notificationDismissedRef.current = false;
    silenceTimerRef.current = window.setTimeout(() => {
      if (!notificationDismissedRef.current && sessionActiveRef.current) {
        setShowSilenceNotice(true);
      }
    }, 10000);
  };

  const startListening = () => {
    if (disabled || isListening) return;
    sessionActiveRef.current = true;
    setError("");
    setInterimText("");
    setShowSilenceNotice(false);
    notificationDismissedRef.current = false;
    resetSilenceTimer();
    const recognition = createBrowserSpeechRecognition({
      onStart: () => {
        setIsListening(true);
        onListeningChange?.(true);
      },
      onInterim: (text) => {
        setInterimText(text);
        resetSilenceTimer();
      },
      onFinal: (text) => {
        resetSilenceTimer();
        onTranscript?.(text);
      },
      onError: (code) => {
        setIsListening(false);
        onListeningChange?.(false);
        setInterimText("");
        setError(
          code === "not-allowed"
            ? "Microphone permission was denied."
            : // : "Voice input could not be started."
              ""
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
        {isListening ? (
          <Square size={14} fill="currentColor" />
        ) : (
          <Mic size={17} />
        )}
      </button>
      {showSilenceNotice && (
        <div className="browser-voice-input__notice" role="status">
          <span>Are you still there? Your microphone is open.</span>
          <button
            type="button"
            onClick={() => {
              notificationDismissedRef.current = true;
              setShowSilenceNotice(false);
              window.clearTimeout(silenceTimerRef.current);
            }}
            aria-label="Dismiss microphone reminder"
          >
            ×
          </button>
        </div>
      )}
      {(interimText || error) && (
        <span role={error ? "alert" : undefined}>{error || interimText}</span>
      )}
    </div>
  );
}
