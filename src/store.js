import { configureStore, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const CURRENCY_KEY = "modelwise_history_currency";
const RATES_KEY = "modelwise_exchange_rates_usd";

const readCachedRates = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(RATES_KEY) || "null");
    return cached?.rates && Date.now() - cached.savedAt < 86400000
      ? cached.rates
      : null;
  } catch {
    return null;
  }
};

export const loadExchangeRates = createAsyncThunk(
  "currency/loadExchangeRates",
  async () => {
    const cachedRates = readCachedRates();
    if (cachedRates) return cachedRates;
    const response = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!response.ok) throw new Error("Exchange-rate request failed");
    const data = await response.json();
    if (data.result !== "success" || !data.rates) {
      throw new Error("Exchange rates are unavailable");
    }
    localStorage.setItem(
      RATES_KEY,
      JSON.stringify({ rates: data.rates, savedAt: Date.now() })
    );
    return data.rates;
  },
  {
    condition: (_, { getState }) => getState().currency.status !== "loading",
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: { user: null },
  reducers: {
    setUser: (state, action) => { state.user = action.payload; },
    clearUser: (state) => { state.user = null; },
  },
});

const currencySlice = createSlice({
  name: "currency",
  initialState: {
    selected: localStorage.getItem(CURRENCY_KEY) || "USD",
    rates: readCachedRates(),
    status: "idle",
  },
  reducers: {
    setCurrency: (state, action) => {
      state.selected = action.payload;
      localStorage.setItem(CURRENCY_KEY, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadExchangeRates.pending, (state) => {
        state.status = "loading";
      })
      .addCase(loadExchangeRates.fulfilled, (state, action) => {
        state.rates = action.payload;
        state.status = "ready";
      })
      .addCase(loadExchangeRates.rejected, (state) => {
        state.status = "failed";
      });
  },
});

export const { setUser, clearUser } = authSlice.actions;
export const { setCurrency } = currencySlice.actions;
export const store = configureStore({
  reducer: { auth: authSlice.reducer, currency: currencySlice.reducer },
});
