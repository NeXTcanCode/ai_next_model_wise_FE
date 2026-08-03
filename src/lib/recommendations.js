const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null);

const finiteNumber = (...values) => {
  const value = firstValue(...values);
  if (value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const modelName = (model) => {
  if (typeof model === "string") return model;
  return (
    model?.displayName ||
    model?.name ||
    model?.modelName ||
    model?.model?.displayName ||
    model?.model?.name ||
    "Unknown model"
  );
};

export const normalizeReasons = (reasons) => {
  if (Array.isArray(reasons)) {
    return reasons
      .map((reason) =>
        typeof reason === "string"
          ? reason.trim()
          : String(reason?.message || reason?.reason || "").trim()
      )
      .filter(Boolean);
  }
  return typeof reasons === "string" && reasons.trim() ? [reasons.trim()] : [];
};

export const normalizeConfidence = (confidence) => {
  const parsed = Number(confidence);
  if (!Number.isFinite(parsed)) return null;
  const percentage = parsed >= 0 && parsed <= 1 ? parsed * 100 : parsed;
  return Math.round(Math.min(100, Math.max(0, percentage)));
};

export const normalizeRanking = (ranking = [], recommendedModel = null) => {
  if (!Array.isArray(ranking)) return [];

  const recommendedId = recommendedModel?.id;
  const recommendedName = modelName(recommendedModel);

  return ranking
    .map((entry, index) => {
      const source = typeof entry === "object" && entry !== null ? entry : {};
      const nested =
        typeof source.model === "object" && source.model !== null
          ? source.model
          : {};
      const name = modelName(entry);
      const id = firstValue(source.id, source.modelId, nested.id, name);
      const rank = finiteNumber(source.rank, source.position) || index + 1;
      const providerName = firstValue(
        source.providerName,
        source.provider,
        nested.providerName,
        nested.provider
      );
      const score = finiteNumber(
        source.score,
        source.fitScore,
        source.totalScore,
        source.overallScore
      );
      const estimatedInputCostUsd = finiteNumber(
        source.estimatedInputCostUsd,
        source.estimatedCostUsd,
        source.inputCostUsd,
        source.inputCost
      );
      const inputPricePerMillion = finiteNumber(
        source.inputPricePerMillion,
        nested.inputPricePerMillion
      );
      const reasons = normalizeReasons(
        firstValue(source.reasons, source.reason, source.explanation)
      );
      const isRecommended = Boolean(
        source.isRecommended ||
          source.recommended ||
          (recommendedId && id === recommendedId) ||
          (recommendedName !== "Unknown model" && name === recommendedName)
      );

      return {
        ...nested,
        ...source,
        id,
        rank,
        displayName: name,
        name,
        providerName,
        score,
        estimatedInputCostUsd,
        inputPricePerMillion,
        reasons,
        isRecommended,
      };
    })
    .sort((a, b) => a.rank - b.rank)
    .map((model, index) => ({ ...model, rank: index + 1 }));
};

export const recommendationResult = (data) => {
  const recommendedModel = data?.recommendedModel || {};
  const alternativeModel = data?.alternativeModel || null;

  return {
    id: data?.recommendationId,
    modelId: recommendedModel.id,
    model: modelName(recommendedModel),
    confidence: normalizeConfidence(data?.confidence),
    summary: data?.summary,
    inputTokens: finiteNumber(data?.estimatedInputTokens),
    inputCost: finiteNumber(data?.estimatedInputCostUsd),
    estimatedSavingsUsd: finiteNumber(data?.estimatedSavingsUsd),
    reasons: normalizeReasons(data?.reasons),
    assessment: data?.assessment || null,
    alternative: alternativeModel
      ? {
          id: alternativeModel.id,
          name: modelName(alternativeModel),
        }
      : null,
  };
};
