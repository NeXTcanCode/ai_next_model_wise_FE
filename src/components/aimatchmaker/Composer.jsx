import React from "react";
import {
  ArrowUp,
  ChevronDown,
  ImagePlus,
  Square,
  Sparkles,
  X,
} from "lucide-react";
import BrowserVoiceInput from "../BrowserVoiceInput";
import LocalImageOCR from "./LocalImageOCR";
import LocalTokenOptimiser from "./LocalTokenOptimiser";

export default function Composer({
  inputRef,
  imageInputRef,
  message,
  setMessage,
  selectedImage,
  setSelectedImage,
  chooseImage,
  imageChatEnabled,
  isVoiceListening,
  setIsVoiceListening,
  isResponding,
  stopGeneration,
  handleSend,
  chatMode,
  coderTask,
  setCoderTask,
  answerStyle,
  setAnswerStyle,
  setResponseMode,
  composerHints,
  placeholderIndex,
  hasManualModelChoice,
  recommendedModelName,
  selectedModel,
  models,
  skills = [],
  annotations = [],
  setAnnotations,
}) {
  const slashQuery = message.startsWith("/")
    ? message.slice(1).split(/\s/)[0].toLowerCase()
    : "";
  const skillSuggestions =
    slashQuery === ""
      ? skills
      : skills.filter((skill) => skill.name.includes(slashQuery));
  const chooseSkill = (skill) => setMessage(`${skill.prompt} `);
  return (
    <form className="ai_match_maker__composer" onSubmit={handleSend}>
      {imageChatEnabled && selectedImage && (
        <div className="ai_match_maker__image-preview">
          <img src={selectedImage.previewUrl} alt="Selected upload preview" />
          <span>{selectedImage.file.name}</span>
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            aria-label="Remove selected image"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <textarea
        ref={inputRef}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder={
          message || isVoiceListening || isResponding
            ? ""
            : composerHints[placeholderIndex]
        }
        rows={1}
        aria-label="Message NeXT AI"
      />
      {annotations.length > 0 && <div className="ai_match_maker__annotations" aria-label="Selected annotations">{annotations.map((annotation, index) => <button type="button" key={annotation.id} onClick={() => setAnnotations((current) => current.filter((item) => item.id !== annotation.id))}>Annotation {index + 1} ×</button>)}</div>}
      {message.startsWith("/") && skillSuggestions.length > 0 && (
        <div className="skill-command-menu" role="listbox">
          {skillSuggestions.slice(0, 8).map((skill) => (
            <button
              type="button"
              key={skill.name}
              onClick={() => chooseSkill(skill)}
            >
              <Sparkles size={14} /> /{skill.name}
            </button>
          ))}
        </div>
      )}
      {imageChatEnabled && (
        <input
          ref={imageInputRef}
          className="ai_match_maker__image-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={chooseImage}
        />
      )}
      <div className="ai_match_maker__composer-actions">
        <LocalImageOCR
          onTextExtracted={(text) =>
            setMessage((current) => (current ? `${current}\n\n${text}` : text))
          }
        />
        <BrowserVoiceInput
          disabled={isResponding}
          onListeningChange={setIsVoiceListening}
          onTranscript={(transcript) =>
            setMessage((current) =>
              current ? `${current} ${transcript}` : transcript
            )
          }
        />
        {imageChatEnabled && (
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            aria-label="Upload an image"
            title="Upload image"
          >
            <ImagePlus size={17} />
          </button>
        )}
        {chatMode === "coder" && (
          <label className="ai_match_maker__model-picker ai_match_maker__coder-task-picker">
            <select
              value={coderTask}
              onChange={(event) => setCoderTask(event.target.value)}
              aria-label="Choose coding task"
            >
              <option value="debug">Debug</option>
              <option value="build">Build</option>
              <option value="review">Review</option>
              <option value="refactor">Refactor</option>
              <option value="test">Test</option>
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </label>
        )}
        <label className="ai_match_maker__model-picker ai_match_maker__style-picker">
          <select
            value={answerStyle}
            onChange={(event) => {
              const value = event.target.value;
              setAnswerStyle(value);
              setResponseMode(chatMode === "normal" ? value : "standard");
              localStorage.setItem("next_ai_response_mode", value);
            }}
            aria-label="Answer style"
          >
            {chatMode === "coder" ? (
              <>
                <option value="standard">Standard</option>
                <option value="structured">Structured</option>
                <option value="code-only">Code only</option>
              </>
            ) : (
              <>
                <option value="concise">Concise</option>
                <option value="standard">Standard</option>
                <option value="detailed">Detailed</option>
              </>
            )}
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </label>
        {isResponding ? (
          <button
            type="button"
            className="ai_match_maker__send ai_match_maker__stop"
            onClick={stopGeneration}
            aria-label="Stop generating"
            title="Stop generating"
          >
            <Square size={13} fill="currentColor" />
          </button>
        ) : (
          <button
            className="ai_match_maker__send"
            type="submit"
            disabled={!message.trim() && !selectedImage && !annotations.length}
            aria-label="Send message"
          >
            <ArrowUp size={17} />
          </button>
        )}
      </div>
      {hasManualModelChoice &&
        recommendedModelName &&
        selectedModel &&
        models.find((model) => model.id === selectedModel)?.displayName !==
          recommendedModelName && (
          <span
            className="ai_match_maker__model-hint"
            title="NeXT recommended a model for this prompt; you chose to use another model."
          >
            Recommended model: {recommendedModelName} · Your selection:{" "}
            {models.find((model) => model.id === selectedModel)?.displayName ||
              "Selected model"}
          </span>
        )}
      <LocalTokenOptimiser message={message} setMessage={setMessage} />
      <small>NeXT AI currently supports text-based conversations</small>
    </form>
  );
}
