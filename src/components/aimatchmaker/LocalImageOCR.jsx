import React, { useRef, useState } from "react";
import { FileSearch, LoaderCircle } from "lucide-react";
import { createWorker } from "tesseract.js";

export default function LocalImageOCR({ onTextExtracted }) {
  const inputRef = useRef(null);
  const [reading, setReading] = useState(false);

  const readImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setReading(true);
    const worker = await createWorker("eng");
    try {
      const { data } = await worker.recognize(file);
      const text = data.text.trim();
      if (text) onTextExtracted(text);
      else window.dispatchEvent(new CustomEvent("next-ai:ocr-empty"));
    } finally {
      await worker.terminate();
      setReading(false);
    }
  };

  return <>
    <input ref={inputRef} className="ai_match_maker__image-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={readImage} />
    <button type="button" onClick={() => inputRef.current?.click()} disabled={reading} aria-label="Extract text from image" title="Extract text locally from image">
      {reading ? <LoaderCircle className="spin" size={17} /> : <FileSearch size={17} />}
    </button>
  </>;
}
