const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export const browserSpeechSupported = Boolean(SpeechRecognition);

export const createBrowserSpeechRecognition = ({
  onStart,
  onInterim,
  onFinal,
  onError,
  onEnd,
  language = navigator.language || "en-US",
} = {}) => {
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = language;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => onStart?.();
  recognition.onresult = (event) => {
    let interim = "";
    let finalText = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0]?.transcript || "";
      if (event.results[index].isFinal) finalText += transcript;
      else interim += transcript;
    }
    if (interim) onInterim?.(interim.trim());
    if (finalText.trim()) onFinal?.(finalText.trim());
  };
  recognition.onerror = (event) => onError?.(event.error || "unknown");
  recognition.onend = () => onEnd?.();

  return recognition;
};
