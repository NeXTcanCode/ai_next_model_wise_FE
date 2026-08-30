import React, { useEffect, useRef, useState } from "react";
import Modal from "react-modal";
import {
  ArrowUp,
  Bot,
  ChevronDown,
  Copy,
  ImagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Square,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import BrowserVoiceInput from "./BrowserVoiceInput";

// IMAGE CHAT TEMPORARILY DISABLED.
// Change this to true when the backend vision endpoint is ready to go live.
const IMAGE_CHAT_ENABLED = false;

const renderInlineMarkdown = (content, keyPrefix = "part") =>
  String(content || "")
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, index) =>
      /^\*\*[^*]+\*\*$/.test(part) ? (
        <strong key={`${keyPrefix}-bold-${index}`}>{part.slice(2, -2)}</strong>
      ) : (
        <React.Fragment key={`${keyPrefix}-text-${index}`}>
          {part}
        </React.Fragment>
      )
    );

const renderMessageContent = (content) =>
  String(content || "")
    .split("\n")
    .map((line, index, lines) => {
      const heading = line.match(/^###\s+(.+)$/);
      const contentNode = heading ? (
        <span className="ai_match_maker__markdown-heading">
          {renderInlineMarkdown(heading[1], `heading-${index}`)}
        </span>
      ) : (
        renderInlineMarkdown(line, `line-${index}`)
      );

      return (
        <React.Fragment key={`message-line-${index}`}>
          {contentNode}
          {index < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });

export default function AIMatchmaker({ onUsageRefresh, userName }) {
  const unavailableMessage =
    "NeXT AI is temporarily unavailable. Please try again in a moment.";
  const visionUnavailableMessage =
    "NeXT AI image analysis is temporarily unavailable. Please try again in a moment.";
  const [message, setMessage] = useState("");
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [recommendedModelName, setRecommendedModelName] = useState("");
  const [hasManualModelChoice, setHasManualModelChoice] = useState(false);
  const [responseMode, setResponseMode] = useState(
    () => localStorage.getItem("next_ai_response_mode") || "standard"
  );
  const [isSelectingModel, setIsSelectingModel] = useState(false);
  const [selectionMessage, setSelectionMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isResponding, setIsResponding] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [selectedExcerpt, setSelectedExcerpt] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [responseFeedback, setResponseFeedback] = useState({});
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [answerStyle, setAnswerStyle] = useState("standard");
  const [chatMode, setChatMode] = useState("normal");
  const [coderTask, setCoderTask] = useState("debug");
  const [showNewChatConfirm, setShowNewChatConfirm] = useState(false);
  const messageInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const imagePreviewUrlsRef = useRef([]);
  const conversationRef = useRef(null);
  const conversationEndRef = useRef(null);
  const selectedModelRef = useRef("");
  const lastRecommendedPromptRef = useRef("");
  const requestAbortControllerRef = useRef(null);
  const composerHints = [
    "Enter to send · Shift + Enter for a new line · Esc to stop",
    "Click New Chat to open a fresh conversation",
    "Push to talk using the microphone",
  ];
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
    if (message || isVoiceListening || isResponding) return undefined;
    const timer = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % composerHints.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [message, isVoiceListening, isResponding, composerHints.length]);

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
        ? `${current}${current.endsWith("\n") ? "" : "\n\n"}${
            selectedExcerpt.text
          }`
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

  const recommendAndSelectModel = async (prompt = message, signal) => {
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
      const data = await api("/api/v1/models", { signal });
      const activeModels = (data.models || []).filter(
        (model) => model.isActive !== false
      );
      if (!activeModels.length)
        throw new Error("No active models are available.");
      const recommendation = await api("/api/v1/recommendations", {
        method: "POST",
        signal,
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
        setRecommendedModelName(recommendedModel.displayName);
        if (hasManualModelChoice) return recommendedModel;
        selectedModelRef.current = recommendedModel.id;
        setSelectedModel(recommendedModel.id);
        setSelectionMessage(
          `Recommended model: ${recommendedModel.displayName}`
        );
      }
      return recommendedModel || null;
    } catch (error) {
      if (error.name === "AbortError") return null;
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
    const editingIndex = editingMessageId
      ? messages.findIndex((item) => item.id === editingMessageId)
      : -1;
    const messagesBeforeEdit =
      editingIndex >= 0 ? messages.slice(0, editingIndex) : messages;
    const conversationToSend = [...messagesBeforeEdit, userMessage]
      .filter((chatMessage) => !chatMessage.isError)
      .map(({ role, content }) => ({ role, content }));
    setMessages((current) =>
      editingIndex >= 0
        ? [...current.slice(0, editingIndex), userMessage]
        : [...current, userMessage]
    );
    setEditingMessageId(null);
    setSelectedExcerpt(null);
    setMessage("");
    setSelectedImage(null);
    setIsResponding(true);
    const abortController = new AbortController();
    requestAbortControllerRef.current = abortController;
    setSelectionMessage(
      imageToSend ? "NeXT is analyzing your image…" : "Getting your response…"
    );
    if (!imageToSend && !isSelectingModel)
      recommendAndSelectModel(promptToSend, abortController.signal);
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
          signal: abortController.signal,
          body: formData,
        });
      } else {
        data = await api("/api/v1/chat", {
          method: "POST",
          signal: abortController.signal,
          body: JSON.stringify({
            prompt: promptToSend,
            messages: conversationToSend,
            responseMode,
            answerStyle,
            chatMode,
            coderTask: chatMode === "coder" ? coderTask : null,
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
      if (error.name === "AbortError") return;
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
      if (requestAbortControllerRef.current === abortController) {
        requestAbortControllerRef.current = null;
      }
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

  const copyToClipboard = async (content) => {
    try {
      await navigator.clipboard.writeText(String(content || ""));
      setSelectionMessage("Copied to clipboard");
    } catch {
      setSelectionMessage("Could not copy to clipboard");
    }
  };

  const editUserMessage = (messageId, content) => {
    const messageIndex = messages.findIndex((item) => item.id === messageId);
    if (messageIndex < 0) return;
    if (isResponding) return;
    setEditingMessageId(messageId);
    setMessage(content);
    setSelectionMessage("Edit your prompt and send it again");
    window.requestAnimationFrame(() => messageInputRef.current?.focus());
  };

  const setHelpfulFeedback = (messageId, helpful) => {
    setResponseFeedback((current) => ({ ...current, [messageId]: helpful }));
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

  const startNewChat = () => {
    if (messages.length) {
      setShowNewChatConfirm(true);
      return;
    }
    clearChat();
  };

  const clearChat = () => {
    setShowNewChatConfirm(false);
    requestAbortControllerRef.current?.abort();
    requestAbortControllerRef.current = null;
    setIsResponding(false);
    setMessages([]);
    setMessage("");
    setSelectedImage(null);
    setSelectedExcerpt(null);
    setSelectionMessage("");
    setIsSelectingModel(false);
    setEditingMessageId(null);
    lastRecommendedPromptRef.current = "";
    messageInputRef.current?.focus();
  };

  const stopGeneration = () => {
    requestAbortControllerRef.current?.abort();
    setSelectionMessage("Generation stopped");
    setIsResponding(false);
  };

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && isResponding) {
        event.preventDefault();
        stopGeneration();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isResponding]);

  const useStarterPrompt = (prompt) => {
    setMessage(prompt);
    window.requestAnimationFrame(() => messageInputRef.current?.focus());
  };

  const prepareRegeneration = () => {
    const lastUserMessage = [...messages]
      .reverse()
      .find((item) => item.role === "user");
    if (!lastUserMessage) return;
    setMessage(lastUserMessage.content);
    setSelectionMessage("Prompt restored — send to regenerate the response");
    window.requestAnimationFrame(() => messageInputRef.current?.focus());
  };

  return (
    <section className="ai_match_maker">
      {messages.length > 0 && (
        <div className="ai_match_maker__conversation-toolbar">
          <button
            type="button"
            className="ai_match_maker__new-chat"
            onClick={startNewChat}
            aria-label="Start a new chat"
          >
            <Plus size={15} />
            <span>New chat</span>
          </button>
        </div>
      )}
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
            <p>Ask a question, explore an idea, or build something new</p>
            <small
              className="ai_match_maker__privacy-note"
              style={{ color: "#8b8596", fontSize: "9px", display: "block" }}
            >
              Private by design - Incognito Mode — we don’t store your NeXT AI
              chats or prompts
            </small>
            <div
              className="ai_match_maker__mode-tabs"
              role="tablist"
              aria-label="NeXT AI mode"
            >
              <button
                type="button"
                className={chatMode === "normal" ? "active" : ""}
                onClick={() => {
                  setChatMode("normal");
                  setAnswerStyle("standard");
                }}
                role="tab"
                aria-selected={chatMode === "normal"}
              >
                Normal mode
              </button>
              <button
                type="button"
                className={chatMode === "coder" ? "active" : ""}
                onClick={() => {
                  setChatMode("coder");
                  setCoderTask("debug");
                  setAnswerStyle("standard");
                }}
                role="tab"
                aria-selected={chatMode === "coder"}
              >
                Coder mode
              </button>
            </div>
          </div>
        )}
        {messages.map((chatMessage) =>
          chatMessage.role === "user" ? (
            <div
              className="ai_match_maker__user-message-wrap"
              key={chatMessage.id}
            >
              <div className="ai_match_maker__user-message">
                {chatMessage.imageUrl && (
                  <img
                    src={chatMessage.imageUrl}
                    alt={chatMessage.imageName || "Uploaded image"}
                  />
                )}
                {chatMessage.content}
              </div>
              <div className="ai_match_maker__message-actions ai_match_maker__user-actions">
                <button
                  type="button"
                  onClick={() => copyToClipboard(chatMessage.content)}
                  aria-label="Copy prompt"
                  title="Copy prompt"
                >
                  <Copy size={13} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    editUserMessage(chatMessage.id, chatMessage.content)
                  }
                  aria-label="Edit prompt"
                  title="Edit prompt"
                >
                  <Pencil size={13} />
                </button>
              </div>
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
              <p>{renderMessageContent(chatMessage.content)}</p>
              {!chatMessage.isError && (
                <div className="ai_match_maker__message-actions ai_match_maker__response-actions">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(chatMessage.content)}
                    aria-label="Copy response"
                    title="Copy response"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    type="button"
                    className={
                      responseFeedback[chatMessage.id] === true
                        ? "selected"
                        : ""
                    }
                    onClick={() => setHelpfulFeedback(chatMessage.id, true)}
                    aria-label="Helpful response"
                    title="Helpful"
                  >
                    <ThumbsUp size={13} />
                  </button>
                  <button
                    type="button"
                    className={
                      responseFeedback[chatMessage.id] === false
                        ? "selected"
                        : ""
                    }
                    onClick={() => setHelpfulFeedback(chatMessage.id, false)}
                    aria-label="Not helpful response"
                    title="Not helpful"
                  >
                    <ThumbsDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={prepareRegeneration}
                    aria-label="Regenerate response"
                    title="Regenerate response"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              )}
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
          placeholder={
            message || isVoiceListening || isResponding
              ? ""
              : composerHints[placeholderIndex]
          }
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
          <BrowserVoiceInput
            disabled={isResponding}
            onListeningChange={setIsVoiceListening}
            onTranscript={(transcript) =>
              setMessage((current) =>
                current ? `${current} ${transcript}` : transcript
              )
            }
          />
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
              onChange={(event) => {
                const nextModel = event.target.value;
                setHasManualModelChoice(Boolean(nextModel));
                setSelectedModel(nextModel);
                selectedModelRef.current = nextModel;
                const chosen = models.find((model) => model.id === nextModel);
                setSelectionMessage(
                  chosen?.displayName === recommendedModelName
                    ? `Recommended model: ${chosen.displayName}`
                    : `Using your selected model: ${
                        chosen?.displayName || "Selected model"
                      }`
                );
              }}
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
                const nextStyle = event.target.value;
                setAnswerStyle(nextStyle);
                setResponseMode(chatMode === "normal" ? nextStyle : "standard");
                localStorage.setItem("next_ai_response_mode", nextStyle);
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
              disabled={!message.trim() && !selectedImage}
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
              {models.find((model) => model.id === selectedModel)
                ?.displayName || "Selected model"}
            </span>
          )}
        <small>NeXT AI currently supports text-based conversations.</small>
      </form>
      <Modal
        isOpen={showNewChatConfirm}
        onRequestClose={() => setShowNewChatConfirm(false)}
        contentLabel="Confirm new chat"
        className="new-chat-confirm-card"
        overlayClassName="new-chat-confirm-overlay"
      >
        <h2>Start a new chat?</h2>
        <p>The current conversation will be cleared.</p>
        <div className="new-chat-confirm-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => setShowNewChatConfirm(false)}
          >
            Cancel
          </button>
          <button type="button" className="primary" onClick={clearChat}>
            New chat
          </button>
        </div>
      </Modal>
    </section>
  );
}
