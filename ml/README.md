# GigShield ML Service

Internal AI/ML microservice for **GigShield** — a parametric insurance platform for food delivery gig workers in India (Swiggy, Zomato, Zepto, Blinkit). Built for **Guidewire DEVTrails 2026**.

Instead of workers filing manual claims, GigShield automatically detects environmental disruptions and triggers payouts. This service is the AI brain behind those decisions.

No auth on any endpoint — this service is internal only.

---

## What it does

| Endpoint | Method | What it returns |
|---|---|---|
| `/health` | GET | Health check |
| `/ml/risk-score` | POST | Risk label + suggested weekly premium for a worker |
| `/ml/fraud-score` | POST | Fraud probability + auto-approve / review / reject decision |
| `/ml/disruption-score` | POST | Disruption probability from live weather + AQI data |
| `/ml/income-loss` | POST | Estimated INR income loss during a disruption |
| `/ml/income-shock` | POST | Detects sudden anomalous drops in worker earnings |
| `/ml/vulnerability-score` | POST | 0–1 worker vulnerability index |
| `/ml/premium` | POST | Dynamic weekly premium (3-factor pricing) |
| `/ml/trigger` | POST | **Core engine** — full parametric pipeline + AI explanation |
| `/ml/heatmap` | GET | Composite risk scores for 8 Indian metro cities |
| `/ml/correlations` | GET | AI-learned env factor → income impact insights |
| `/triggers/weather` | GET | Live weather data + breach status for a zone |
| `/triggers/aqi` | GET | Live AQI + breach status for a zone |
| `/triggers/mock-alerts` | GET | Strike / curfew / traffic alerts for a zone |

---

## Folder structure

```
ml/
├── main.py                         # FastAPI app — all routers registered here
├── requirements.txt
├── .env                            # API keys (GROQ, OpenWeatherMap, AQICN)
├── .gitignore
├── README.md
├── app/
│   ├── __init__.py
│   ├── config.py                   # pydantic-settings config
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── health.py
│   │   ├── risk.py                 # Random Forest inference
│   │   ├── fraud.py                # Isolation Forest inference
│   │   ├── disruption.py           # Disruption detection + heatmap + correlations
│   │   ├── income.py               # Income loss + income shock detection
│   │   ├── vulnerability.py        # Worker vulnerability score
│   │   ├── premium.py              # Dynamic premium pricing
│   │   └── trigger.py              # Core parametric trigger engine
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── risk.py
│   │   ├── fraud.py
│   │   ├── disruption.py
│   │   ├── income.py
│   │   ├── vulnerability.py
│   │   ├── premium.py
│   │   └── trigger.py
│   └── services/
│       ├── __init__.py
│       ├── weather.py              # OpenWeatherMap wrapper (mock)
│       ├── aqi.py                  # AQICN wrapper (mock)
│       ├── mock_alerts.py          # Strike/curfew mock
│       ├── disruption_model.py     # Multi-factor disruption scorer
│       ├── income_loss.py          # Income loss predictor
│       ├── income_shock.py         # Isolation Forest earnings anomaly detector
│       ├── vulnerability_score.py  # Worker vulnerability calculator
│       ├── premium_engine.py       # Dynamic pricing engine
│       ├── city_risk.py            # City heatmap data + correlation insights
│       └── ai_explainer.py         # Groq Llama 3 explanation engine
└── models/
    ├── generate_data.py            # Synthetic training data generator
    ├── train_risk.py               # Random Forest training script
    ├── train_fraud.py              # Isolation Forest training script
    └── saved/
        ├── risk_model.joblib       # Trained risk model (generated after training)
        └── fraud_model.joblib      # Trained fraud model (generated after training)
```

---

## Running locally

```bash
# 1. Set up virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt
```

Copy `.env` and fill in your API keys:

```env
OPENWEATHERMAP_API_KEY=your-key
AQICN_API_KEY=your-key
GROQ_API_KEY=your-groq-key     # Get free at console.groq.com
```

Generate training data and train the models:

```bash
python models/generate_data.py
python models/train_risk.py
python models/train_fraud.py
```

Start the server (two options — both work):

```bash
# Option 1: direct Python (recommended)
python main.py

# Option 2: uvicorn CLI
uvicorn main:app --reload --port 8000
```

Swagger docs at `http://localhost:8000/docs`.

---

## ML Models

### Risk Scorer — Random Forest Classifier

Trained on **5,000 synthetic gig worker records** with India-specific distributions.

**Training data design:**
- `low` risk: 1,500 records — experienced workers (12–60 months), safe zones, clean claim history
- `medium` risk: 3,000 records — moderate tenure, average zones, some claims
- `high` risk: 500 records — new workers (<6 months), dangerous zones, high claim history

**Features:**

| Feature | Weight learned | Why it matters |
|---|---|---|
| `months_active` | **38.9%** | Inexperience = biggest risk factor |
| `zone_flood_risk` | **24.8%** | Zone geography |
| `zone_heat_risk` | **21.0%** | Zone climate |
| `avg_daily_hours` | **11.3%** | Overwork increases risk |
| `past_claims_count` | **4.0%** | Claims history |

**Model config:** `RandomForestClassifier(n_estimators=200, max_depth=10, class_weight="balanced")`

**Saved to:** `models/saved/risk_model.joblib`

---

### Fraud Detector — Isolation Forest

Unsupervised anomaly detection — learns what normal claims look like and flags outliers. No labeled fraud data required.

**Trained on:** 5,000 synthetic claims with 90% normal / 10% fraudulent distribution.

**Features:**

| Feature | Fraud signal |
|---|---|
| `gps_zone_match` | Mismatch → strong fraud indicator |
| `claim_velocity_7d` | > 5 claims/week → suspicious |
| `historical_zone_presence` | Low presence → unfamiliar zone |
| `time_since_event_seconds` | < 5 min → filed suspiciously fast |
| `platform_activity_during_event` | < 20% → not actually working |

**Model config:** `IsolationForest(n_estimators=200, contamination=0.10)`

**Inference:** Uses `model.predict()` for binary decision (1=normal, -1=anomaly). Rule-based overrides applied on top for high-confidence fraud signals.

**Sanity check accuracy:** 93% overall, 64% fraud recall (strong for unsupervised).

**Saved to:** `models/saved/fraud_model.joblib`

---

## Premium Calculation

### Quick estimate — returned with `/ml/risk-score`

```
suggested_premium = base[risk_label] × (avg_daily_hours / 8.0)

base: low=₹40, medium=₹70, high=₹120
```

### Full dynamic pricing — `/ml/premium`

```
climate_multiplier    = 1.0 + (city_climate_risk      × 0.50)   → max 1.5x
disruption_multiplier = 1.0 + (disruption_probability × 0.40)   → max 1.4x
vulnerability_multiplier = 1.0 + (vulnerability_score  × 0.30)  → max 1.3x

weekly_premium = base × climate × disruption × vulnerability

Tiers: Starter (≤₹55) | Standard (≤₹90) | Enhanced (≤₹140) | Premium (>₹140)
```

---

## Parametric Trigger Engine — `/ml/trigger`

The core of GigShield. Orchestrates all AI modules in a single pipeline:

```
Step 1: Disruption Assessment
        → assess_disruption(weather + AQI data)
        → disruption_probability < 0.39? → status: "no_disruption"

Step 2: Fraud Check
        → IsolationForest.predict() + rule overrides
        → fraud_score >= 0.60? → status: "rejected"

Step 3: Income Loss Prediction
        → predict_income_loss(disruption_type, severity, worker profile)
        → payout = min(weekly_loss, coverage_cap)

Step 4: Payout Decision
        → fraud_score < 0.30 → status: "approved" (auto payout)
        → fraud_score 0.30–0.60 → status: "pending_review"

Step 5: AI Explanation
        → Groq Llama 3 (llama3-8b-8192) generates natural language explanation
        → Falls back to deterministic explanation if GROQ_API_KEY not set
```

**Disruption threshold:** `0.39` (aligned with IMD heatwave advisory standards)

---

## Disruption Detection

Multi-factor scoring using **IMD India & CPCB AQI official thresholds:**

| Factor | Weight | Trigger starts at | Extreme |
|---|---|---|---|
| Rainfall | 35% | 20mm | 150mm (flood) |
| Temperature | 30% | 38°C | 48°C (severe heatwave) |
| AQI | 25% | 151 (Poor) | 401 (Severe) |
| Wind Speed | 10% | 30 km/h | 90 km/h |

Compound disruption detected when 2+ factors are simultaneously elevated.

---

## AI Explanation Engine

Uses **Groq API** (`llama3-8b-8192`) to generate professional insurance report explanations for every trigger decision.

**Setup:**
1. Get a free API key at [console.groq.com](https://console.groq.com)
2. Set `GROQ_API_KEY=your-key` in `.env`

**Fallback:** If `GROQ_API_KEY` is not set or the API call fails, a deterministic rule-based explanation is generated. The trigger endpoint never breaks.

---

## API Examples

### POST /ml/risk-score

Request:
```json
{
  "worker_id": "W_0012",
  "zone_id": 3,
  "platform": "Swiggy",
  "months_active": 4,
  "avg_daily_hours": 10.5,
  "past_claims_count": 2,
  "zone_flood_risk": 0.80,
  "zone_heat_risk": 0.60
}
```

Response:
```json
{
  "risk_score": 0.82,
  "risk_label": "high",
  "suggested_premium": 157.5,
  "coverage_recommended": 1200
}
```

### POST /ml/trigger

Request:
```json
{
  "worker_id": "W_0012",
  "zone_id": "Z_MUM_001",
  "policy_id": "POL-2847",
  "temperature_celsius": 46.5,
  "rainfall_mm": 0.0,
  "aqi_score": 420,
  "wind_speed_kmh": 12.0,
  "gps_zone_match": true,
  "claim_velocity_7d": 1,
  "historical_zone_presence": 0.85,
  "time_since_event_seconds": 3600,
  "platform_activity_during_event": 0.7,
  "worker_daily_orders": 15,
  "avg_income_per_order": 80.0,
  "risk_label": "high"
}
```

Response:
```json
{
  "payout_triggered": true,
  "payout_amount_inr": 700.0,
  "disruption_probability": 0.51,
  "disruption_type": "poor_air_quality",
  "fraud_score": 0.09,
  "fraud_cleared": true,
  "expected_income_loss_inr": 756.0,
  "decision_reason": "Auto-approved. Disruption: poor_air_quality (51% probability). Estimated weekly loss: Rs.756. Payout: Rs.700.",
  "ai_explanation": "A severe air quality disruption was detected in the worker's zone with an AQI of 420, classified as hazardous by CPCB standards. Combined with a temperature of 46.5C, environmental conditions significantly impaired safe delivery operations. Fraud verification confirmed normal claim behaviour with a score of 0.09. An automatic parametric payout of Rs.700 has been issued in accordance with the active policy.",
  "status": "approved"
}
```

---

## Tech Stack

| Component | Technology |
|---|---|
| API Framework | FastAPI + Uvicorn |
| Risk Model | scikit-learn RandomForestClassifier |
| Fraud Model | scikit-learn IsolationForest |
| Income Shock Detector | IsolationForest (fitted inline per worker) |
| AI Explanations | Groq API — Llama 3 (llama3-8b-8192) |
| Data Validation | Pydantic v2 |
| Model Serialization | joblib |
| Config | pydantic-settings |
| Training Data | Synthetic — 5,000 records, India-specific distributions |

---

## Status

All endpoints are fully wired and operational. Both ML models (Random Forest + Isolation Forest) are trained and loaded from `models/saved/`. The Groq AI explanation engine is integrated into the trigger pipeline with automatic fallback. Weather and AQI services have real HTTP call stubs (TODOs in service files) — currently return mock data until real API keys are wired in.
