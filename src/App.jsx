import React, { useEffect, useRef, useState } from "react";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles.css";
import Auth from "./components/Auth";
import AIMatchmaker from "./components/AIMatchmaker";
import HistoryView from "./components/HistoryView";
import ModelModal from "./components/ModelModal";
import Models from "./components/Models";
import RankingView from "./components/RankingView";
import Recommend from "./components/Recommend";
import Sidebar from "./components/Sidebar";
import NextAISidebar from "./components/NextAISidebar";
import SkillPage from "./components/skills/SkillPage";
import SkillsPage from "./components/skills/SkillsPage";
import NextAIUsageHistory from "./components/NextAIUsageHistory";
import StatusSummary from "./components/StatusSummary";
import { api } from "./lib/api";
import {
  normalizeRanking,
  recommendationResult,
} from "./lib/recommendations";
import { clearUser, setUser } from "./store";

function Shell({
  user,
  dispatch,
  view,
  setView,
  menu,
  setMenu,
  usage,
  historyTotals,
  models,
  rankedModels,
  prompt,
  setPrompt,
  context,
  setContext,
  contextDetails,
  setContextDetails,
  result,
  setResult,
  modelModalOpen,
  setModelModalOpen,
  errorMessage,
  setErrorMessage,
  addModel,
  removeModel,
  recommend,
  isRecommending,
  onUsageRefresh,
  onBackToRecommend,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const isSkill = ["/summarise", "/rewrite", "/explain", "/translate", "/debug", "/generate-tests"].includes(location.pathname) || location.pathname.startsWith("/skills/");
  const isNextAIHistory = location.pathname === "/next_ai/history";
  const isNextAI = location.pathname === "/next_ai" || isSkill || isNextAIHistory;
  const currentView = location.pathname === "/skills" ? "skills" : view;
  const [nextAIUsage, setNextAIUsage] = useState({ tokens: 0, messages: 0 });
  useEffect(() => { if (!isNextAI) return; api("/api/v1/usage/history?days=7").then((data) => setNextAIUsage((data.events || []).reduce((total, event) => ({ tokens: total.tokens + (event.inputTokens || 0) + (event.outputTokens || 0), messages: total.messages + 1 }), { tokens: 0, messages: 0 }))).catch(() => {}); }, [isNextAI]);
  const changeView = (nextView) => {
    const path = nextView === "bot" ? "/next_ai" : `/${nextView}`;
    setView(nextView);
    navigate(path);
  };
  return (
    <div className="app-shell">
      {isNextAI ? <NextAISidebar
        activeChatId={null}
        onSelectChat={(id) => window.dispatchEvent(new CustomEvent("next-ai:select", { detail: id }))}
        onNewChat={() => window.dispatchEvent(new Event("next-ai:new"))}
        onSkill={(prompt) => window.dispatchEvent(new CustomEvent("next-ai:skill", { detail: prompt }))}
          onBack={() => changeView("recommend")}
          onLogout={async () => {
            await api("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
            localStorage.removeItem("modelwise_session");
            localStorage.removeItem("modelwise_user");
            dispatch(clearUser());
          }}
      /> : <Sidebar
        user={user}
        menu={menu}
        setMenu={setMenu}
        view={currentView}
          setView={changeView}
        usage={usage}
        rankedModels={rankedModels}
        onLogout={async () => {
          await api("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
          localStorage.removeItem("modelwise_session");
          localStorage.removeItem("modelwise_user");
          dispatch(clearUser());
        }}
        />}
      <main>
        <header>
          <button className="mobile-menu" onClick={() => setMenu(!menu)}>
            <span aria-hidden>☰</span>
          </button>
          <div>
            {isNextAIHistory && <button type="button" className="next-ai-history__back" onClick={() => navigate("/next_ai")}>← Back to NeXT AI</button>}
            <span className="eyebrow">
              {currentView === "recommend"
                ? "WORKSPACE / RECOMMEND"
                : `WORKSPACE / ${currentView.toUpperCase()}`}
            </span>
            <h1>
              {currentView === "recommend"
                ? "Find your best model"
                : currentView === "history"
                ? "Recommendation history"
              : currentView === "ranking"
              ? "Model ranking"
              : currentView === "skills"
              ? "Skills"
              : currentView === "bot"
              ? "NeXT AI"
              : "My models"}
            </h1>
          </div>
          <div className="header-actions">
            {/* NeXT AI usage summary is intentionally held for a better UX decision.
                Restore this block when the usage presentation is finalized. */}
            {!isNextAI && <>
              <StatusSummary
                tokens={historyTotals.tokens}
                cost={historyTotals.cost}
                label="recommendation tokens"
                emptyLabel="Recommendation history"
              />
              <button className="text-button" onClick={() => changeView("history")}>
                View history
              </button>
            </>}
          </div>
        </header>
        {location.pathname === "/skills" ? <SkillsPage /> : isNextAIHistory ? <NextAIUsageHistory /> : isSkill ? <SkillPage /> : view === "bot" ? (
          <AIMatchmaker onUsageRefresh={onUsageRefresh} userName={user.name} onBackToRecommend={() => changeView("recommend")} />
        ) : view === "recommend" ? (
          <Recommend
            prompt={prompt}
            setPrompt={setPrompt}
            context={context}
            setContext={setContext}
            contextDetails={contextDetails}
            setContextDetails={setContextDetails}
            recommend={recommend}
            isRecommending={isRecommending}
            result={result}
            models={models}
            onAddModel={() => setModelModalOpen(true)}
            onManage={() => setView("models")}
            onCloseResult={() => setResult(null)}
          />
        ) : view === "history" ? (
          <HistoryView />
        ) : view === "ranking" ? (
          <RankingView models={rankedModels} />
        ) : (
          <Models
            models={models}
            addModel={addModel}
            removeModel={removeModel}
            onAddModel={() => setModelModalOpen(true)}
          />
        )}
      </main>
      <ModelModal
        isOpen={modelModalOpen}
        onClose={() => setModelModalOpen(false)}
        onSubmit={addModel}
        error={errorMessage}
      />
    </div>
  );
}

function App() {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const [view, setView] = useState(() => {
    const path = window.location.pathname;
    return path === "/ranking" ? "ranking" : path === "/next_ai" ? "bot" : path === "/history" ? "history" : path === "/models" ? "models" : path === "/skills" ? "skills" : "recommend";
  });
  const navigateView = (nextView) => {
    const path = nextView === "bot" ? "/next_ai" : `/${nextView}`;
    window.history.pushState({}, "", path);
    setView(nextView);
  };
  const [models, setModels] = useState([]);
  const [rankedModels, setRankedModels] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("No additional context");
  const [contextDetails, setContextDetails] = useState("");
  const [result, setResult] = useState(null);
  const [menu, setMenu] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [usage, setUsage] = useState({ usedUnits: 0, limitUnits: 40000, percent: 0, resetAt: null });
  const [historyTotals, setHistoryTotals] = useState({ tokens: 0, cost: 0 });
  const [isRecommending, setIsRecommending] = useState(false);

  const recommendInFlight = useRef(false);
  const refreshUsage = () => {
    api("/api/v1/usage").then(setUsage).catch(() => {});
  };
  const updatePrompt = (value) => {
    setPrompt(value);
    setResult(null);
  };
  const updateContext = (value) => {
    setContext(value);
    if (value === "No additional context") setContextDetails("");
    setResult(null);
  };
  const updateContextDetails = (value) => {
    setContextDetails(value);
    setResult(null);
  };

  useEffect(() => {
    const handleUnauthorized = () => dispatch(clearUser());
    window.addEventListener("modelwise:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("modelwise:unauthorized", handleUnauthorized);
  }, [dispatch]);
  useEffect(() => {
    if (!localStorage.getItem("modelwise_session")) return;
    api("/api/v1/auth/me", { timeoutMs: 12000 })
      .then((data) => {
        localStorage.setItem("modelwise_user", JSON.stringify(data.user));
        dispatch(setUser(data.user));
      })
      .catch(() => {
        localStorage.removeItem("modelwise_session");
        localStorage.removeItem("modelwise_user");
        dispatch(clearUser());
      });
  }, []);
  useEffect(() => {
    if (!user) return;
    api("/api/v1/models")
      .then((data) => {
        setModels(data.models.map((model) => model.displayName));
      })
      .catch(() => {});
    api("/api/v1/usage")
      .then(setUsage)
      .catch(() => {});
    api("/api/v1/recommendations?limit=100")
      .then((data) => {
        const items = data.items || [];
        const latestRanked = items.find((item) =>
          Array.isArray(item.result?.ranking) && item.result.ranking.length
        );
        setRankedModels(
          latestRanked
            ? normalizeRanking(latestRanked.result.ranking, {
                id: latestRanked.result.recommendedModelId,
                name: latestRanked.result.recommendedModelName,
              })
            : []
        );
        setHistoryTotals({
          tokens: items.reduce(
            (total, item) => total + (item.result?.estimatedInputTokens || 0),
            0
          ),
          cost: items.reduce(
            (total, item) => total + (item.result?.estimatedInputCostUsd || 0),
            0
          ),
        });
      })
      .catch(() => {});
  }, [user]);
  const addModel = async (name, providerName, price, openRouterModelId, outputPrice) => {
    if (!name?.trim()) return;
    try {
      const data = await api("/api/v1/models", {
        method: "POST",
        body: JSON.stringify({
          displayName: name.trim(),
          providerName,
          inputPricePerMillion: price ? Number(price) : null,
          outputPricePerMillion: outputPrice ? Number(outputPrice) : null,
          openRouterModelId,
        }),
      });
      setModels((current) => [...current, data.model.displayName]);
      setRankedModels([]);
      setResult(null);
      setModelModalOpen(false);
    } catch (error) {
      setErrorMessage(error.message);
    }
  };
  const removeModel = async (name) => {
    try {
      const data = await api("/api/v1/models");
      const model = data.models.find((item) => item.displayName === name);
      if (!model) throw new Error("Model not found.");
      await api(`/api/v1/models/${model.id}`, { method: "DELETE" });
      setModels((current) => current.filter((item) => item !== name));
      setRankedModels([]);
      setResult(null);
    } catch (error) {
      toast.error(error.message);
    }
  };
  const recommend = async () => {
    if (recommendInFlight.current) return;
    if (prompt.length < 3 || prompt.length > 20000)
      return toast.error("Prompt must be 3–20,000 characters.");
    recommendInFlight.current = true;
    setIsRecommending(true);
    setResult(null);
    setErrorMessage("");
    try {
      const available = await api("/api/v1/models");
      const active = available.models.filter((model) => model.isActive);
      if (!active.length)
        throw new Error("Add at least one active model first.");
      const data = await api("/api/v1/recommendations", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          candidateModelIds: active.map((model) => model.id),
          context: {
            hasContext: context !== "No additional context",
            contextType:
              context === "No additional context"
                ? "none"
                : context.toLowerCase().replaceAll(" ", "_"),
            contextDetails:
              context === "No additional context" ? "" : contextDetails,
          },
        }),
      });
      setResult(recommendationResult(data));
      setRankedModels((current) => {
        if (Array.isArray(data.ranking) && data.ranking.length) {
          return normalizeRanking(data.ranking, data.recommendedModel);
        }

        const fallback = current.length ? current : active;
        return normalizeRanking(fallback, data.recommendedModel);
      });
      setHistoryTotals((current) => ({
        tokens: current.tokens + (data.estimatedInputTokens || 0),
        cost: current.cost + (data.estimatedInputCostUsd || 0),
      }));
    } catch (error) {
      toast.error(error.message);
    } finally {
      recommendInFlight.current = false;
      setIsRecommending(false);
    }
  };

  if (!user)
    return (
      <Auth
        onLogin={(account) => {
          localStorage.setItem("modelwise_user", JSON.stringify(account));
          dispatch(setUser(account));
        }}
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
      />
    );
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/ranking" element={
          <Shell
            user={user}
            dispatch={dispatch}
            view={view}
            setView={navigateView}
            menu={menu}
            setMenu={setMenu}
            usage={usage}
            historyTotals={historyTotals}
            models={models}
            rankedModels={rankedModels}
            prompt={prompt}
            setPrompt={updatePrompt}
            context={context}
            setContext={updateContext}
            contextDetails={contextDetails}
            setContextDetails={updateContextDetails}
            result={result}
            setResult={setResult}
            modelModalOpen={modelModalOpen}
            setModelModalOpen={setModelModalOpen}
            errorMessage={errorMessage}
            setErrorMessage={setErrorMessage}
            addModel={addModel}
            removeModel={removeModel}
            recommend={recommend}
            isRecommending={isRecommending}
            onUsageRefresh={refreshUsage}
            onBackToRecommend={() => navigateView("recommend")}
          />
        } />
        <Route path="*" element={
          <Shell
            user={user}
            dispatch={dispatch}
            view={view}
            setView={navigateView}
            menu={menu}
            setMenu={setMenu}
            usage={usage}
            historyTotals={historyTotals}
            models={models}
            rankedModels={rankedModels}
            prompt={prompt}
            setPrompt={updatePrompt}
            context={context}
            setContext={updateContext}
            contextDetails={contextDetails}
            setContextDetails={updateContextDetails}
            result={result}
            setResult={setResult}
            modelModalOpen={modelModalOpen}
            setModelModalOpen={setModelModalOpen}
            errorMessage={errorMessage}
            setErrorMessage={setErrorMessage}
            addModel={addModel}
            removeModel={removeModel}
            recommend={recommend}
            isRecommending={isRecommending}
            onUsageRefresh={refreshUsage}
            onBackToRecommend={() => navigateView("recommend")}
          />
        } />
      </Routes>
      <ToastContainer position="top-right" autoClose={4000} />
    </BrowserRouter>
  );
}

export default App;
