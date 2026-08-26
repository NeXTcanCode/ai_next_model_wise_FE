import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  ChevronDown,
  ImagePlus,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "../lib/api";

// IMAGE CHAT TEMPORARILY DISABLED.
// Change this to true when the backend vision endpoint is ready to go live.
const IMAGE_CHAT_ENABLED = false;

export default function AIMatchmaker({ onUsageRefresh, userName }) {
  const unavailableMessage =
    "NeXT AI is temporarily unavailable. Please try again in a moment.";
  const visionUnavailableMessage =
    "NeXT AI image analysis is temporarily unavailable. Please try again in a moment.";
  const [message, setMessage] = useState("");
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [responseMode, setResponseMode] = useState(
    () => localStorage.getItem("next_ai_response_mode") || "standard"
  );
  const [isSelectingModel, setIsSelectingModel] = useState(false);
  const [selectionMessage, setSelectionMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isResponding, setIsResponding] = useState(false);
  const [selectedExcerpt, setSelectedExcerpt] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const messageInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const imagePreviewUrlsRef = useRef([]);
  const conversationRef = useRef(null);
  const conversationEndRef = useRef(null);
  const selectedModelRef = useRef("");
  const lastRecommendedPromptRef = useRef("");
  const hour = new Date().getHours();
  const firstName = String(userName || "")
    .trim()
    .split(/\s+/)[0];
  const timeGreeting =
    hour >= 5 && hour < 12
      ? "Good morning"
      : hour >= 12 && hour < 17
      ? "Good afternoon"
      : hour >= 17 && hour < 22
      ? "Good evening"
      : "Up late";

  useEffect(() => {
    selectedModelRef.current = selectedModel;
  }, [selectedModel]);

  useEffect(() => {
    api("/api/v1/models")
      .then((data) => {
        const availableModels = (data.models || []).filter(
          (model) => model.isActive !== false
        );
        setModels(availableModels);
        setSelectedModel((current) => current || availableModels[0]?.id || "");
      })
      .catch(() => setModels([]));
  }, []);

  useEffect(() => {
    const input = messageInputRef.current;
    if (!input) return;

    input.style.height = "auto";
    const maximumHeight = Math.min(320, window.innerHeight * 0.4);
    const nextHeight = Math.min(input.scrollHeight, maximumHeight);
    input.style.height = `${nextHeight}px`;
    input.style.overflowY =
      input.scrollHeight > maximumHeight ? "auto" : "hidden";
  }, [message]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({
      behavior: messages.length > 1 ? "smooth" : "auto",
      block: "end",
    });
  }, [messages, isResponding]);

  useEffect(() => {
    if (!message.trim() || selectedImage) return undefined;
    const timer = window.setTimeout(() => recommendAndSelectModel(), 5000);
    return () => window.clearTimeout(timer);
  }, [message, selectedImage]);

  useEffect(
    () => () => {
      imagePreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  useEffect(() => {
    const dismissSelectionAction = (event) => {
      if (event.type !== "keydown" || event.key === "Escape") {
        setSelectedExcerpt(null);
      }
    };
    window.addEventListener("scroll", dismissSelectionAction, true);
    window.addEventListener("keydown", dismissSelectionAction);
    return () => {
      window.removeEventListener("scroll", dismissSelectionAction, true);
      window.removeEventListener("keydown", dismissSelectionAction);
    };
  }, []);

  const showSelectionAction = () => {
    window.requestAnimationFrame(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (!selection || selection.isCollapsed || !text) {
        setSelectedExcerpt(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const container = conversationRef.current;
      const selectedNode =
        range.commonAncestorContainer.nodeType === Node.TEXT_NODE
          ? range.commonAncestorContainer.parentElement
          : range.commonAncestorContainer;
      const messageElement = selectedNode?.closest?.(
        ".ai_match_maker__user-message, .ai_match_maker__response"
      );
      if (!container?.contains(selectedNode) || !messageElement) {
        setSelectedExcerpt(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      const buttonWidth = 112;
      const left = Math.min(
        window.innerWidth - buttonWidth - 12,
        Math.max(12, rect.right + 8)
      );
      const top =
        rect.bottom + 44 < window.innerHeight
          ? rect.bottom + 8
          : Math.max(8, rect.top - 42);
      setSelectedExcerpt({ text, left, top });
    });
  };

  const addSelectionToChat = () => {
    if (!selectedExcerpt?.text) return;
    setMessage((current) =>
      current
        ? `${current}${current.endsWith("\n") ? "" : "\n\n"}${selectedExcerpt.text}`
        : selectedExcerpt.text
    );
    setSelectedExcerpt(null);
    window.getSelection()?.removeAllRanges();
    window.requestAnimationFrame(() => {
      const input = messageInputRef.current;
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    });
  };

  const recommendAndSelectModel = async (prompt = message) => {
    const promptToRecommend = prompt.trim();
    if (!promptToRecommend || isSelectingModel) return null;
    if (lastRecommendedPromptRef.current === promptToRecommend) {
      return (
        models.find((model) => model.id === selectedModelRef.current) || null
      );
    }
    setIsSelectingModel(true);
    setSelectionMessage("Choosing the best model…");
    try {
      const data = await api("/api/v1/models");
      const activeModels = (data.models || []).filter(
        (model) => model.isActive !== false
      );
      if (!activeModels.length)
        throw new Error("No active models are available.");
      const recommendation = await api("/api/v1/recommendations", {
        method: "POST",
        body: JSON.stringify({
          prompt: promptToRecommend,
          candidateModelIds: activeModels.map((model) => model.id),
          context: {
            hasContext: false,
            contextType: "none",
            contextDetails: "",
          },
        }),
      });
      lastRecommendedPromptRef.current = promptToRecommend;
      const recommendedId =
        recommendation.recommendedModelId ||
        recommendation.recommendedModel?.id;
      const recommendedModel = activeModels.find(
        (model) => model.id === recommendedId
      );
      if (recommendedModel) {
        selectedModelRef.current = recommendedModel.id;
        setSelectedModel(recommendedModel.id);
        setSelectionMessage(`${recommendedModel.displayName} selected`);
      }
      return recommendedModel || null;
    } catch (error) {
      setSelectionMessage(error.message || "Could not choose a model.");
      return null;
    } finally {
      setIsSelectingModel(false);
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const imageToSend = selectedImage;
    const promptToSend =
      message.trim() || (imageToSend ? "Describe this image." : "");
    if (!promptToSend || isResponding) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: promptToSend,
      imageUrl: imageToSend?.previewUrl || null,
      imageName: imageToSend?.file.name || null,
    };
    const conversationToSend = [...messages, userMessage]
      .filter((chatMessage) => !chatMessage.isError)
      .map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, userMessage]);
    setSelectedExcerpt(null);
    setMessage("");
    setSelectedImage(null);
    setIsResponding(true);
    setSelectionMessage(
      imageToSend ? "NeXT is analyzing your image…" : "Getting your response…"
    );
    if (!imageToSend && !isSelectingModel) recommendAndSelectModel(promptToSend);
    try {
      let data;
      if (imageToSend) {
        const formData = new FormData();
        formData.append("image", imageToSend.file);
        formData.append("prompt", promptToSend);
        formData.append("messages", JSON.stringify(conversationToSend));
        formData.append("responseMode", responseMode);
        data = await api("/api/v1/chat/image", {
          method: "POST",
          body: formData,
        });
      } else {
        data = await api("/api/v1/chat", {
          method: "POST",
          body: JSON.stringify({
            prompt: promptToSend,
            messages: conversationToSend,
            responseMode,
          }),
        });
      }
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.response || "No response was returned.",
        },
      ]);
      onUsageRefresh?.();
      // setSelectionMessage(`Response from ${data.provider}`);
      if (imageToSend) {
        setSelectionMessage("Image analyzed by NeXT Vision");
      } else {
        const selectedModelName =
          models.find((model) => model.id === selectedModelRef.current)
            ?.displayName || "Auto";
        setSelectionMessage(`Recommended model: ${selectedModelName}`);
      }
    } catch (error) {
      setSelectionMessage("");
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: error.message || "Could not get a response.",
          isError: true,
          retryPrompt:
            error.message === unavailableMessage ||
            error.message === visionUnavailableMessage
              ? promptToSend
              : null,
          retryImage:
            error.message === visionUnavailableMessage ? imageToSend : null,
        },
      ]);
    } finally {
      setIsResponding(false);
    }
  };

  const restorePromptForRetry = (prompt, image = null) => {
    setMessage(prompt);
    if (image) setSelectedImage(image);
    window.requestAnimationFrame(() => {
      const input = messageInputRef.current;
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    });
  };

  const chooseImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      setSelectionMessage("Upload a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSelectionMessage("Choose an image smaller than 5 MB.");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    imagePreviewUrlsRef.current.push(previewUrl);
    setSelectedImage({ file, previewUrl });
    setSelectionMessage("");
  };

  return (
    <section className="ai_match_maker">
      <div
        ref={conversationRef}
        className="ai_match_maker__conversation"
        onMouseUp={showSelectionAction}
        onTouchEnd={showSelectionAction}
      >
        {!messages.length && !isResponding && (
          <div className="ai_match_maker__welcome">
            <div className="ai_match_maker__welcome-title">
              <span>
                <Sparkles size={24} />
              </span>
              <h2>
                {timeGreeting}
                {firstName ? `, ${firstName}` : ""}
              </h2>
            </div>
            <p>Ask a question, explore an idea, or build something new.</p>
            {/* <div className="ai_match_maker__welcome-prompts">
              <button type="button" onClick={() => setMessage("Review my code and suggest improvements")}>Review code</button>
              <button type="button" onClick={() => setMessage("Explain a difficult concept in simple terms")}>Explain a concept</button>
              <button type="button" onClick={() => setMessage("Help me analyze this text")}>Analyze text</button>
              <button type="button" onClick={() => setMessage("Help me write something compelling")}>Write something</button>
            </div> */}
          </div>
        )}
        {messages.map((chatMessage) =>
          chatMessage.role === "user" ? (
            <div className="ai_match_maker__user-message" key={chatMessage.id}>
              {chatMessage.imageUrl && (
                <img
                  src={chatMessage.imageUrl}
                  alt={chatMessage.imageName || "Uploaded image"}
                />
              )}
              {chatMessage.content}
            </div>
          ) : (
            <article
              className={`ai_match_maker__response${
                chatMessage.isError ? " ai_match_maker__response--error" : ""
              }`}
              key={chatMessage.id}
            >
              <div className="ai_match_maker__response-identity">
                <span>
                  <Bot size={15} />
                </span>
                <b>NeXT AI</b>
              </div>
              <p>{chatMessage.content}</p>
              {chatMessage.retryPrompt && (
                <button
                  type="button"
                  className="ai_match_maker__retry"
                  onClick={() =>
                    restorePromptForRetry(
                      chatMessage.retryPrompt,
                      chatMessage.retryImage
                    )
                  }
                >
                  <RotateCcw size={14} />
                  Retry
                </button>
              )}
            </article>
          )
        )}
        {isResponding && (
          <div
            className="ai_match_maker__thinking"
            role="status"
            aria-live="polite"
          >
            <span className="ai_match_maker__thinking-mark">
              <Bot size={16} />
            </span>
            <span>NeXT is thinking</span>
            <span className="ai_match_maker__thinking-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        <div ref={conversationEndRef} aria-hidden="true" />
        {/* <div className="ai_match_maker__intro">
            <div className="ai_match_maker__avatar">
              <Bot size={22} strokeWidth={1.8} />
            </div>
          </div> */}

        {/* <div
            className="ai_match_maker__suggestions"
            aria-label="Suggested prompts"
          >
            <button
              type="button"
              onClick={() =>
                setMessage("Help me choose a model for a coding task")
              }
            >
              <Sparkles size={16} />
              <span>Choose a model for coding</span>
            </button>
            <button
              type="button"
              onClick={() =>
                setMessage("I need a model to analyze a long document")
              }
            >
              <Sparkles size={16} />
              <span>Analyze a long document</span>
            </button>
          </div> */}
      </div>

      {selectedExcerpt && (
        <button
          type="button"
          className="ai_match_maker__add-to-chat"
          style={{ left: selectedExcerpt.left, top: selectedExcerpt.top }}
          onMouseDown={(event) => event.preventDefault()}
          onClick={addSelectionToChat}
        >
          Add to chat
        </button>
      )}

      <form className="ai_match_maker__composer" onSubmit={handleSend}>
        {IMAGE_CHAT_ENABLED && selectedImage && (
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
          ref={messageInputRef}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Message NeXT AI"
          rows={1}
          aria-label="Message NeXT AI"
        />
        {IMAGE_CHAT_ENABLED && (
          <input
            ref={imageInputRef}
            className="ai_match_maker__image-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={chooseImage}
          />
        )}
        <div className="ai_match_maker__composer-actions">
          {IMAGE_CHAT_ENABLED && (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              aria-label="Upload an image"
              title="Upload image"
            >
              <ImagePlus size={17} />
            </button>
          )}
          <label className="ai_match_maker__model-picker">
            <select
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
              aria-label="Select AI model"
            >
              {!models.length && <option value="">Auto</option>}
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.displayName}
                </option>
              ))}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </label>
          <label className="ai_match_maker__model-picker ai_match_maker__length-picker">
            <select
              value={responseMode}
              onChange={(event) => {
                setResponseMode(event.target.value);
                localStorage.setItem(
                  "next_ai_response_mode",
                  event.target.value
                );
              }}
              aria-label="Response length"
            >
              <option value="concise">Concise</option>
              <option value="standard">Standard</option>
              <option value="detailed">Detailed</option>
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </label>
          <button
            className="ai_match_maker__send"
            type="submit"
            disabled={(!message.trim() && !selectedImage) || isResponding}
            aria-label="Send message"
          >
            <ArrowUp size={17} />
          </button>
        </div>
        <small>
          {selectionMessage ||
            (IMAGE_CHAT_ENABLED
              ? "NeXT AI supports text and image conversations."
              : "NeXT AI currently supports text-based conversations.")}
        </small>
      </form>
    </section>
  );
}
