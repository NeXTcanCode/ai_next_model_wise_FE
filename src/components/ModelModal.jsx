import React, { useEffect, useMemo, useState } from "react";
import Modal from "react-modal";
import { ArrowRight, Sparkles } from "lucide-react";
import { api } from "../lib/api";

export default function ModelModal({ isOpen, onClose, onSubmit, error }) {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("Other");
  const [price, setPrice] = useState("");
  const [openRouterModelId, setOpenRouterModelId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [pricingError, setPricingError] = useState("");
  const [tab, setTab] = useState("manual");
  const [catalog, setCatalog] = useState([]);
  const [providerQuery, setProviderQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedModels, setSelectedModels] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const providers = useMemo(() => [...new Set(catalog.map((model) => model.providerName))].sort(), [catalog]);
  const providerSuggestions = providers.filter((provider) => provider.toLowerCase().includes(providerQuery.toLowerCase())).slice(0, 8);
  const providerModels = catalog.filter((model) => model.providerName === selectedProvider && model.displayName.toLowerCase().includes(providerQuery.toLowerCase()));

  useEffect(() => {
    if (tab !== "provider" || catalog.length) return;
    setCatalogLoading(true);
    api("/api/v1/models/catalog")
      .then((data) => setCatalog(data.models || []))
      .catch((error) => setPricingError(error.message))
      .finally(() => setCatalogLoading(false));
  }, [tab, catalog.length]);

  const lookupPricing = async (modelName) => {
    setPricingError("");
    try {
      const data = await api("/api/v1/models/pricing", {
        method: "POST",
        body: JSON.stringify({ query: modelName }),
      });
      if (data.pricing) {
        setPrice(String(data.pricing.inputPricePerMillion));
        setOpenRouterModelId(data.pricing.modelId);
        return data.pricing;
      }
      setPricingError("Price unavailable.");
    } catch (lookupError) {
      setPricingError(lookupError.message);
    }
    return null;
  };

  useEffect(() => {
    if (!name.trim()) return setSuggestions([]);
    const timer = setTimeout(
      () =>
        api("/api/v1/models/suggestions", {
          method: "POST",
          body: JSON.stringify({ query: name }),
        })
          .then((data) => setSuggestions(data.suggestions || []))
          .catch(() => {}),
      350
    );
    return () => clearTimeout(timer);
  }, [name]);

  useEffect(() => {
    if (!name.trim() || suggestions.length) return;
    const timer = setTimeout(() => lookupPricing(name.trim()), 700);
    return () => clearTimeout(timer);
  }, [name, suggestions.length]);

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    if (!price) {
      const pricing = await lookupPricing(name.trim());
      if (pricing)
        return onSubmit(name.trim(), provider, pricing.inputPricePerMillion, pricing.modelId);
      return;
    }
    onSubmit(name.trim(), provider, price, openRouterModelId);
  };

  const addSelected = () => {
    selectedModels.forEach((model) => onSubmit(
      model.displayName,
      model.providerName,
      model.inputPricePerMillion,
      model.openRouterModelId,
      model.outputPricePerMillion
    ));
    setSelectedModels([]);
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Add model"
      className="modal-card"
      overlayClassName="modal-overlay"
    >
      <button className="modal-close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <span className="eyebrow">MODEL LIBRARY / SETUP</span>
      <h2>Choose a model</h2>
      <p>Add a model to your shortlist.</p>
      <div className="modal-tabs" role="tablist">
        <button type="button" className={tab === "manual" ? "active" : ""} onClick={() => setTab("manual")}>Add manually</button>
        <button type="button" className={tab === "provider" ? "active" : ""} onClick={() => setTab("provider")}>Browse providers</button>
      </div>
      {tab === "provider" ? (
        <div className="provider-browser">
          <div className="modal-section">
            <label htmlFor="provider-name">PROVIDER</label>
            <input id="provider-name" value={providerQuery} onChange={(event) => setProviderQuery(event.target.value)} placeholder="Choose a provider" />
            {!selectedProvider && providerQuery && <div className="model-suggestions">{providerSuggestions.map((provider) => <button type="button" key={provider} onClick={() => { setSelectedProvider(provider); setProviderQuery(provider); }}>{provider}</button>)}</div>}
          </div>
          {selectedProvider && <>
            <div className="provider-heading"><b>{selectedProvider} models</b><button type="button" onClick={() => { setSelectedProvider(""); setProviderQuery(""); }}>Change</button></div>
            {catalogLoading ? <p>Loading models…</p> : <div className="provider-model-list">{providerModels.map((model) => { const checked = selectedModels.some((item) => item.openRouterModelId === model.openRouterModelId); return <label className="provider-model" key={model.openRouterModelId}><input type="checkbox" checked={checked} onChange={() => setSelectedModels((current) => checked ? current.filter((item) => item.openRouterModelId !== model.openRouterModelId) : [...current, model])} /><span><b>{model.displayName}</b><small>${model.inputPricePerMillion?.toFixed(2) ?? "—"} input / ${model.outputPricePerMillion?.toFixed(2) ?? "—"} output per 1M tokens</small></span></label>; })}</div>}
          </>}
          {!selectedProvider && !catalogLoading && !providerQuery && <p>Type a provider name to see available options.</p>}
          <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button type="button" className="primary" disabled={!selectedModels.length} onClick={addSelected}>Add selected models <ArrowRight size={16} /></button></div>
        </div>
      ) : (
      <form onSubmit={submit}>
        <div className="modal-section">
          <label htmlFor="model-name">MODEL NAME</label>
          <input
            id="model-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Claude Sonnet"
          />
          {suggestions.length > 0 && (
            <div className="model-suggestions">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.displayName}
                  type="button"
                  onClick={() => {
                    setName(suggestion.displayName);
                    setProvider(suggestion.providerName);
                    setOpenRouterModelId(suggestion.openRouterModelId);
                    setSuggestions([]);
                    lookupPricing(suggestion.displayName);
                  }}
                >
                  <span>{suggestion.displayName}</span>
                  <small>{suggestion.providerName}</small>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="modal-note">
          <Sparkles size={16} />
          <span>
            <b>Why add this?</b>
            <small>
              It becomes an available candidate when we recommend the best fit
              for your prompt.
            </small>
          </span>
        </div>
        <small className="modal-help">
          {error || pricingError || "You can edit or disable it later."}
        </small>
        <div className="modal-section">
          <label htmlFor="model-price">INPUT PRICE / 1M TOKENS (USD)</label>
          <input id="model-price" value={price} readOnly placeholder="" />
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={!name.trim()}>
            Add to my models <ArrowRight size={16} />
          </button>
        </div>
      </form>)}
    </Modal>
  );
}
