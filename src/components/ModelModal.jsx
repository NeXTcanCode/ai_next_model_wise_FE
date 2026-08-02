import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import { ArrowRight, Sparkles } from "lucide-react";
import { api } from "../lib/api";

export default function ModelModal({ isOpen, onClose, onSubmit, error }) {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("Other");
  const [price, setPrice] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [pricingError, setPricingError] = useState("");

  const lookupPricing = async (modelName) => {
    setPricingError("");
    try {
      const data = await api("/api/v1/models/pricing", {
        method: "POST",
        body: JSON.stringify({ query: modelName }),
      });
      if (data.pricing) {
        setPrice(String(data.pricing.inputPricePerMillion));
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
        return onSubmit(name.trim(), provider, pricing.inputPricePerMillion);
      return;
    }
    onSubmit(name.trim(), provider, price);
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
      </form>
    </Modal>
  );
}
