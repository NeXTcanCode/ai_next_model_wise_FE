import React, { useEffect, useRef, useState } from "react";
import { Bot, Plus } from "lucide-react";
import { api } from "../lib/api";
import ChatMessages from "./aimatchmaker/ChatMessages";
import Composer from "./aimatchmaker/Composer";
import NewChatModal from "./aimatchmaker/NewChatModal";
import SelectionAction from "./aimatchmaker/SelectionAction";
import WelcomeState from "./aimatchmaker/WelcomeState";

// IMAGE CHAT TEMPORARILY DISABLED.
// Change this to true when the backend vision endpoint is ready to go live.
const IMAGE_CHAT_ENABLED = false;

export default function AIMatchmaker({
  onUsageRefresh,
  userName,
  onBackToRecommend,
}) {
  const unavailableMessage =
    "NeXT AI is temporarily unavailable. Please try again in a moment.";
  const visionUnavailableMessage =
    "NeXT AI image analysis is temporarily unavailable. Please try again in a moment.";
  const [message, setMessage] = useState("");
  const [models, setModels] = useState([]);
  const [skills, setSkills] = useState([
    { name: "summarise", prompt: "Summarise this clearly:" },
    {
      name: "rewrite",
      prompt: "Rewrite this to be clearer and more polished:",
    },
    { name: "explain", prompt: "Explain this simply:" },
    { name: "translate", prompt: "Translate this into English:" },
    { name: "debug", prompt: "Help me debug this code:\n" },
    { name: "generate-tests", prompt: "Generate tests for this code:\n" },
  ]);
  const [selectedModel, setSelectedModel] = useState("");
  const [recommendedModelName, setRecommendedModelName] = useState("");
  const [hasManualModelChoice, setHasManualModelChoice] = useState(false);
  const [responseMode, setResponseMode] = useState(
    () => localStorage.getItem("next_ai_response_mode") || "standard"
  );
  const [isSelectingModel, setIsSelectingModel] = useState(false);
  const [selectionMessage, setSelectionMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [isResponding, setIsResponding] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [selectedExcerpt, setSelectedExcerpt] = useState(null);
  const [annotations, setAnnotations] = useState([]);
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
    "Type / to use skills",
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
    api("/api/v1/skills")
      .then((data) =>
        setSkills((current) => [
          ...current,
          ...(data.skills || []).map((skill) => ({
            name: skill.name.toLowerCase().replace(/\s+/g, "-"),
            prompt: skill.markdown,
          })),
        ])
      )
      .catch(() => {});
  }, []);
  useEffect(() => {
    const prompt = sessionStorage.getItem("next_ai_skill_prompt");
    if (prompt) {
      setMessage(prompt);
      sessionStorage.removeItem("next_ai_skill_prompt");
    }
  }, []);

  useEffect(() => {
    const input = messageInputRef.current;
    if (!input) return;

    input.style.height = "auto";
    // Let the composer grow with the prompt, then scroll once it reaches the
    // same maximum height defined for the textarea in styles.css.
    const maximumHeight = Math.min(320, window.innerHeight * 0.45);
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
    setAnnotations((current) => current.some((item) => item.text === selectedExcerpt.text) ? current : [...current, { id: `annotation-${Date.now()}`, text: selectedExcerpt.text }]);
    setSelectedExcerpt(null);
    window.getSelection()?.removeAllRanges();
    window.requestAnimationFrame(() => {
      const input = messageInputRef.current;
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    });
  };
  const askAboutSelection = (question) => {
    addSelectionToChat();
    setMessage(question);
    window.requestAnimationFrame(() => messageInputRef.current?.focus());
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
    const annotationContext = annotations.length ? `Regarding these selected sections:\n\n${annotations.map((item, index) => `[Annotation ${index + 1}]\n${item.text}`).join("\n\n")}\n\n` : "";
    const promptToSend = `${annotationContext}${message.trim()}`.trim() || (imageToSend ? "Describe this image." : "");
    if (!promptToSend || isResponding) return;

    let activeConversationId = conversationId;
    if (!activeConversationId) {
      try {
        const data = await api("/api/v1/chats", {
          method: "POST",
          body: JSON.stringify({}),
        });
        activeConversationId = data.chat.id;
        setConversationId(activeConversationId);
      } catch (error) {
        setSelectionMessage(error.message || "Could not create chat.");
        return;
      }
    }

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
    setAnnotations([]);
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
            conversationId: activeConversationId,
          }),
        });
      }
      setMessages((current) => [
        ...current.map((item) =>
          item.id === userMessage.id ? { ...item, usage: data.usage } : item
        ),
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.response || "No response was returned.",
          usage: data.usage,
        },
      ]);
      onUsageRefresh?.();
      window.dispatchEvent(new Event("next-ai:chats-changed"));
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
    setConversationId(null);
    setMessage("");
    setSelectedImage(null);
    setSelectedExcerpt(null);
    setAnnotations([]);
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

  const openChat = async (chatId) => {
    try {
      const data = await api(`/api/v1/chats/${chatId}`);
      setConversationId(chatId);
      setMessages(data.chat.messages || []);
      setMessage("");
      setSelectionMessage("");
    } catch (error) {
      setSelectionMessage(error.message || "Could not load chat.");
    }
  };

  const useSkill = (prompt) => {
    setMessage(prompt);
    window.requestAnimationFrame(() => messageInputRef.current?.focus());
  };

  useEffect(() => {
    const select = (event) => openChat(event.detail);
    const fresh = () => clearChat();
    const skill = (event) => useSkill(event.detail);
    window.addEventListener("next-ai:select", select);
    window.addEventListener("next-ai:new", fresh);
    window.addEventListener("next-ai:skill", skill);
    return () => {
      window.removeEventListener("next-ai:select", select);
      window.removeEventListener("next-ai:new", fresh);
      window.removeEventListener("next-ai:skill", skill);
    };
  });

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
    <section className="ai_match_maker next-ai-workspace">
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
          <WelcomeState
            greeting={timeGreeting}
            firstName={firstName}
            chatMode={chatMode}
            setChatMode={setChatMode}
            setAnswerStyle={setAnswerStyle}
          />
        )}
        <ChatMessages
          messages={messages}
          feedback={responseFeedback}
          onCopy={copyToClipboard}
          onEdit={editUserMessage}
          onFeedback={setHelpfulFeedback}
          onRegenerate={prepareRegeneration}
          onRetry={restorePromptForRetry}
        />
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
      </div>
      <SelectionAction selection={selectedExcerpt} onAdd={addSelectionToChat} onAsk={askAboutSelection} />
      <Composer
        inputRef={messageInputRef}
        imageInputRef={imageInputRef}
        message={message}
        setMessage={setMessage}
        annotations={annotations}
        setAnnotations={setAnnotations}
        selectedImage={selectedImage}
        setSelectedImage={setSelectedImage}
        chooseImage={chooseImage}
        imageChatEnabled={IMAGE_CHAT_ENABLED}
        isVoiceListening={isVoiceListening}
        setIsVoiceListening={setIsVoiceListening}
        isResponding={isResponding}
        stopGeneration={stopGeneration}
        handleSend={handleSend}
        chatMode={chatMode}
        coderTask={coderTask}
        setCoderTask={setCoderTask}
        answerStyle={answerStyle}
        setAnswerStyle={setAnswerStyle}
        setResponseMode={setResponseMode}
        composerHints={composerHints}
        placeholderIndex={placeholderIndex}
        hasManualModelChoice={hasManualModelChoice}
        recommendedModelName={recommendedModelName}
        selectedModel={selectedModel}
        models={models}
        skills={skills}
      />
      <NewChatModal
        open={showNewChatConfirm}
        onClose={() => setShowNewChatConfirm(false)}
        onConfirm={clearChat}
      />
    </section>
  );
}
