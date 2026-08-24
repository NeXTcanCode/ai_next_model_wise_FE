import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  ChevronDown,
  Paperclip,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "../lib/api";

export default function AIMatchmaker({ onUsageRefresh, userName }) {
  const [message, setMessage] = useState("");
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [responseMode, setResponseMode] = useState(() => localStorage.getItem("next_ai_response_mode") || "standard");
  const [isSelectingModel, setIsSelectingModel] = useState(false);
  const [selectionMessage, setSelectionMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isResponding, setIsResponding] = useState(false);
  const messageInputRef = useRef(null);
  const conversationEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedModelRef = useRef("");
  const lastRecommendedPromptRef = useRef("");
  const hour = new Date().getHours();
  const firstName = String(userName || "").trim().split(/\s+/)[0];
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
    input.style.height = `${input.scrollHeight}px`;

    // Once the composer becomes taller than the comfortable viewport area,
    // keep the bottom controls reachable while the user continues typing or pasting.
    if (input.scrollHeight > 240) {
      const scrollContainer = input.closest("main");
      requestAnimationFrame(() => {
        scrollContainer?.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "auto",
        });
      });
    }
  }, [message]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({
      behavior: messages.length > 1 ? "smooth" : "auto",
      block: "end",
    });
  }, [messages, isResponding]);

  useEffect(() => {
    if (!message.trim()) return undefined;
    const timer = window.setTimeout(() => recommendAndSelectModel(), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const recommendAndSelectModel = async (prompt = message) => {
    const promptToRecommend = prompt.trim();
    if (!promptToRecommend || isSelectingModel) return null;
    if (lastRecommendedPromptRef.current === promptToRecommend) {
      return models.find((model) => model.id === selectedModelRef.current) || null;
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
    const promptToSend = message.trim();
    if (!promptToSend || isResponding) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: promptToSend,
    };
    const conversationToSend = [...messages, userMessage]
      .filter((chatMessage) => !chatMessage.isError)
      .map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, userMessage]);
    setMessage("");
    setIsResponding(true);
    setSelectionMessage("Getting your response…");
    if (!isSelectingModel) recommendAndSelectModel(promptToSend);
    try {
      const data = await api("/api/v1/chat", {
        method: "POST",
        body: JSON.stringify({
          prompt: promptToSend,
          messages: conversationToSend,
          responseMode,
        }),
      });
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
      const selectedModelName =
        models.find((model) => model.id === selectedModelRef.current)
          ?.displayName || "selected model";
      setSelectionMessage(`Recommended model: ${selectedModelName}`);
    } catch (error) {
      setSelectionMessage(error.message || "Could not get a response.");
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: error.message || "Could not get a response.",
          isError: true,
        },
      ]);
    } finally {
      setIsResponding(false);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
    setIsAttachmentMenuOpen(false);
  };

  const handleFiles = (event) => {
    setFiles((current) => [
      ...current,
      ...Array.from(event.target.files || []),
    ]);
    event.target.value = "";
  };

  return (
    <section className="ai_match_maker">
      <div className="ai_match_maker__conversation">
        {!messages.length && !isResponding && (
          <div className="ai_match_maker__welcome">
            <div className="ai_match_maker__welcome-title">
              <span><Sparkles size={24} /></span>
              <h2>{timeGreeting}{firstName ? `, ${firstName}` : ""}</h2>
            </div>
            <p>Ask a question, explore an idea, or build something new.</p>
            <div className="ai_match_maker__welcome-prompts">
              <button type="button" onClick={() => setMessage("Review my code and suggest improvements")}>Review code</button>
              <button type="button" onClick={() => setMessage("Explain a difficult concept in simple terms")}>Explain a concept</button>
              <button type="button" onClick={() => setMessage("Help me analyze this text")}>Analyze text</button>
              <button type="button" onClick={() => setMessage("Help me write something compelling")}>Write something</button>
            </div>
          </div>
        )}
        {messages.map((chatMessage) =>
          chatMessage.role === "user" ? (
            <div className="ai_match_maker__user-message" key={chatMessage.id}>
              {chatMessage.content}
            </div>
          ) : (
            <article
              className={`ai_match_maker__response${chatMessage.isError ? " ai_match_maker__response--error" : ""}`}
              key={chatMessage.id}
            >
              <div className="ai_match_maker__response-identity">
                <span><Bot size={15} /></span>
                <b>NeXT AI</b>
              </div>
              <p>{chatMessage.content}</p>
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

      <form className="ai_match_maker__composer" onSubmit={handleSend}>
        {files.length > 0 && (
          <div
            className="ai_match_maker__attachments"
            aria-label="Attached files"
          >
            {files.map((file, index) => (
              <span
                className="ai_match_maker__attachment"
                key={`${file.name}-${index}`}
              >
                <Paperclip size={14} />
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    setFiles((current) =>
                      current.filter((_, fileIndex) => fileIndex !== index)
                    )
                  }
                  aria-label={`Remove ${file.name}`}
                >
                  <X size={13} />
                </button>
              </span>
            ))}
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
        <input
          ref={fileInputRef}
          className="ai_match_maker__file-input"
          type="file"
          multiple
          onChange={handleFiles}
          aria-hidden="true"
        />
        <div className="ai_match_maker__composer-actions">
          {/* <button type="button" aria-label="Open attachment menu" onClick={() => setIsAttachmentMenuOpen((open) => !open)} aria-expanded={isAttachmentMenuOpen}>
              <Plus size={18} />
            </button> */}
          <button
            type="button"
            aria-label="Attach file"
            onClick={openFilePicker}
          >
            <Paperclip size={17} />
          </button>
          <label className="ai_match_maker__model-picker">
            <select
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
              aria-label="Select AI model"
            >
              {!models.length && <option value="">No models available</option>}
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
                localStorage.setItem("next_ai_response_mode", event.target.value);
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
            disabled={!message.trim() || isResponding}
            aria-label="Send message"
          >
            <ArrowUp size={17} />
          </button>
        </div>
        {isAttachmentMenuOpen && (
          <div className="ai_match_maker__attachment-menu">
            <button type="button" onClick={openFilePicker}>
              <Paperclip size={16} /> Upload files
            </button>
          </div>
        )}
        <small>
          {selectionMessage ||
            "NeXT AI can make mistakes. Check important information."}
        </small>
      </form>
    </section>
  );
}
