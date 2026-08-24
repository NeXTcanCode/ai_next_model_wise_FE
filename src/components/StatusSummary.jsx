import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadExchangeRates } from "../store";

export default function StatusSummary({ tokens, cost }) {
  const dispatch = useDispatch();
  const currency = useSelector((state) => state.currency.selected);
  const rates = useSelector((state) => state.currency.rates);
  useEffect(() => {
    dispatch(loadExchangeRates());
  }, [dispatch]);
  const convertedCost =
    cost != null && (currency === "USD" || rates?.[currency])
      ? cost * (currency === "USD" ? 1 : rates[currency])
      : null;
  const formattedCost =
    convertedCost == null
      ? null
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        }).format(convertedCost);
  return (
    <div className="status-summary">
      <span className="status-dot" />
      <div>
        <b>{tokens ? `${tokens.toLocaleString()} history tokens` : "Recommendation history"}</b>
        <small>{formattedCost ? `Total estimated cost: ${formattedCost}` : "No recommendations yet"}</small>
      </div>
    </div>
  );
}
