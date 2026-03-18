# GigShield ML Service

Internal AI/ML microservice for **GigShield** — a parametric insurance platform for food delivery gig workers in India (Swiggy, Zomato, Zepto, Blinkit). Built for **Guidewire DEVTrails 2026**.

Instead of workers filing manual claims, GigShield automatically detects environmental disruptions and triggers payouts. This service is the AI brain behind those decisions.

No auth on any endpoint — this service is internal only.

---

## 🚀 API Endpoint Reference

| Endpoint | Method | What it returns |
|---|---|---|
| `/health` | GET | Basic `{ "status": "ok" }` health check for container liveness. |
| `/ml/risk-score` | POST | Plan-aware worker risk label and score using a Random Forest bundle, plus the top 3 aggregated risk factors and reference pricing signals used for downstream quoting. |
| `/ml/fraud-score` | POST | Continuous fraud probability score [0.0 - 1.0] from a richer Isolation Forest bundle using claim behavior, plan context, claimed amount, and prior rejection signals. |
| `/ml/disruption-score` | POST | Multi-factor weighted probability index of a climate event. Also includes `disruption_confidence`, a mathematically calibrated margin-distance index [0.0 - 1.0] from the decision boundary. |
| `/ml/income-loss` | POST | Estimated INR income loss during a disruption mapped to standard Indian delivery market impact models (e.g. 70% drop during floods). |
| `/ml/income-shock` | POST | Detects localized sudden anomalous drops in a specific worker's earnings using a dynamically inline-fitted Isolation Forest that treats the worker's own last week as the baseline. |
| `/ml/vulnerability-score` | POST | 0–1 Worker vulnerability index weighting geographical risk, historical disruption counts, weekly working intensity (hours), and earnings fragility (INR/day). |
| `/ml/premium` | POST | Plan-aware dynamic weekly premium generator. Uses DB-backed plan values as anchors and applies bounded multipliers for risk, climate, disruption pressure, vulnerability, and coverage richness. |
| `/ml/trigger` | POST | **Core engine**. Orchestrates all microservices: parses weather variables -> bounds probabilities -> calculates dynamic thresholds -> flags/clears fraud -> generates Llama 3 explanation -> returns fully modeled parametric approval struct. |
| `/ml/heatmap` | GET | Composite multi-factor risk scores and IMD hazard data aggregated for 8 major Indian metro cities. |
| `/ml/correlations` | GET | Returns static researched insights mapping specific environmental thresholds (e.g., AQI > 400) to actual historic gig-economy demand drop percentages. |
| `/triggers/weather` | GET | Stubs for OpenWeatherMap integration. Returns threshold-breached booleans based on hardcoded dummy rules (Temp > 45C or Rain > 50mm). |
| `/triggers/aqi` | GET | Stubs for AQICN api integration. Returns mocked AQI values mapping to > 300 hazard states. |
| `/triggers/mock-alerts` | GET | Stubs for fetching unstructured municipal curfews, traffic bans, or worker strike data. |

---

## 📂 Folder Structure Breakdown

```bash
ml/
├── main.py                         # FastAPI App root — standard registry for all 8 APIRouters.
├── requirements.txt
├── .env                            # Stores API keys (GROQ_API_KEY, OPENWEATHERMAP_API_KEY, AQICN_API_KEY)
├── .gitignore
├── README.md
├── app/                            # Application logic layer
│   ├── __init__.py
│   ├── config.py                   # Standard pydantic-settings config block hook.
│   ├── routers/                    # Controller Layer (Endpoints)
│   │   ├── __init__.py
│   │   ├── health.py               # Liveness checks
│   │   ├── risk.py                 # RF risk model inference & importance mapping
│   │   ├── fraud.py                # IF anomaly inference, rule override injection & probability mapping
│   │   ├── disruption.py           # Multi-factor score thresholding, logic branching & confidence math
│   │   ├── income.py               # Calls to the inline income loss / shock anomaly models
│   │   ├── vulnerability.py        # Algorithmic metric crunching for worker indices
│   │   ├── premium.py              # 3-factor pricing logic API boundary
│   │   └── trigger.py              # CORE Pipeline: Orchestrates all above into one parametric execution
│   ├── schemas/                    # Pydantic v2 BaseModels (Input/Output data validation layer)
│   │   └── trigger.py, risk.py, etc.
│   └── services/                   # Business Logic & External API Abstraction Layer
│       ├── weather.py              # OpenWeatherMap API wrapper abstraction (currently stubs)
│       ├── aqi.py                  # AQICN.org API wrapper abstraction (currently stubs)
│       ├── mock_alerts.py          # Strike/curfew municipal mock abstractions
│       ├── disruption_model.py     # Weighted severity math (IMD thresholds) & prob calibration
│       ├── income_loss.py          # Static dictionary maps for market demand reduction heuristics
│       ├── income_shock.py         # Isolation Forest dynamically fitted to single worker `daily_earnings`
│       ├── vulnerability_score.py  # Algorithmic logic bounding worker metrics into 0-1 scores
│       ├── premium_engine.py       # Algorithmic multiplication logic bounding weekly INR premiums
│       ├── city_risk.py            # Static pre-baked definitions for Indian City IMD heatmap stats
│       ├── model_info.py           # Reads JSON metadata explicitly exported by model training scripts
│       └── ai_explainer.py         # Lazy-loaded Groq client abstracting Llama 3 prompting logic
└── models/                         # Data Science & Training Layer
    ├── generate_data.py            # Generates massive synthetic dataset mimicking real world behavior
    ├── train_risk.py               # scikit-learn training script for Random Forest + JSON metric export
    ├── train_fraud.py              # scikit-learn training script for Isolation Forest + JSON metric export
    └── saved/                      # Model artifact outputs (.joblib, .json)
        ├── risk_model.joblib       # Pickled RandomForestClassifier parameter weights
        ├── risk_model_metrics.json # JSON representation of the classification_report & feature_importances
        ├── fraud_model.joblib      # Pickled IsolationForest anomaly detection weights
        └── fraud_model_metrics.json# JSON representation of IF contamination matrix
```

---

## 🛠️ Running Locally

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

### Data Generation & Training Workflow

Before inference can run, the exact `.joblib` model binaries must be created. Run the modeling pipeline explicitly:

```bash
# 1. Generate local simulated datasets (`models/synthetic_risk_data.csv`, etc)
python models/generate_data.py

# 2. Train the Random Forest (Outputs `saved/risk_model.joblib`)
python models/train_risk.py

# 3. Train the Isolation Forest (Outputs `saved/fraud_model.joblib`)
python models/train_fraud.py
```

### Start the Server

```bash
# Option 1: direct Python (recommended)
python main.py

# Option 2: uvicorn CLI
uvicorn main:app --reload --port 8000
```

Swagger API documentation UI will be available natively at `http://localhost:8000/docs`.

---

## 🔬 Deep Dive: Production-Grade ML Modeling

GigShield incorporates key AI production reliability design patterns. It handles real world data-drifts and probabilistic edge cases using the following implemented approaches:

1. **Probability Calibration (Disruption Model):** Machine learning probabilities near `50%` are inherently dangerous for automated programmatic APIs. Instead of sending out raw triggers around this threshold, the disruption model maps its internal array weights to a globally calibrated `disruption_confidence` score by actively computing the Euclidean output distance from the decision boundary `[min(max(abs(prob - 0.5) * 2, 0.0), 1.0)]`. 
2. **Exposed Feature Importances (Risk Model):** Inference via the Random Forest risk scorer does not just act as a black box. The `/risk-score` endpoint returns aggregated `top_risk_factors` per-request so consumers can explicitly explain the risk. It also returns reference premium/coverage hints, but final product pricing is owned by `/ml/premium`.
3. **Continuous Probability Mapping (Fraud Model):** An `IsolationForest` predicts abstract anomaly indices (from `score_samples`) containing negative floats. We map claims predictably to a bounded `[0.0, 0.45]` positive percentage float index so continuous fraud probability reflects an easily displayable heuristic, rather than forcing UI consumers to parse abstract negative dimensional spaces.
4. **Adaptive Context-Aware Fraud Thresholds:** The core trigger leverages an intelligent macro-aware heuristic boundary: 
   - Normal Disruption (`< 70%` probability) → Standard fraud review trigger blocks at `0.40` score.
   - Extreme Disaster (`> 70%` probability) → The engine relaxes the review threshold to `0.55`, allowing more genuine claims to auto-approve during severe events without weakening hard fraud rejection rules.
5. **Inline Unsupervised Anomaly Detection:** The `/ml/income-shock` module does not rely on global, pre-trained `.joblib` files. Instead, it literally instantiates and geometrically fits a unique, bespoke `IsolationForest` synchronously during the API request natively mapped using the exact sequence arrays of the worker's own historical `daily_earnings`. It scores the past 3 days against the worker's unique timeline baseline, removing the need for a global macro training set.

---

## 🧠 ML Model Architecture

### Risk Scorer — Random Forest Classifier
**File:** `models/train_risk.py` | **Location:** `app/routers/risk.py`

Trained on **5,000 synthetic gig worker records** with India-specific geographic distributions via `generate_data.py`.

**Training Dataset Heuristics Breakdown:**
- `low` risk: 1,500 records — highly experienced workers (12–60 months tenure), safe geographical footprint polygons, clean historical claim patterns.
- `medium` risk: 3,000 records — moderate tenure footprint, average zone density, some low-scale historical claims.
- `high` risk: 500 records — brand new onboarding workers (<6 months tenure), dangerous IMD flood-zone routing, statistically over-indexed historical claim footprints.

**Model Weight Rankings:**
| Feature Node | Learned Sklearn Weight | Domain Logic Mapping |
|---|---|---|
| `months_active` | **38.9%** | Inexperience statistically leads to more accidents and routing inefficiency. |
| `zone_flood_risk` | **24.8%** | Native geographic vulnerability based on IMD data. |
| `zone_heat_risk` | **21.0%** | Native climate hazard mapping. |
| `avg_daily_hours` | **11.3%** | Algorithmic flagging for general overwork fatigue / danger. |
| `past_claims_count` | **4.0%** | Pure historical profiling. |

**Runtime Configuration:** `RandomForestClassifier(n_estimators=200, max_depth=10, class_weight="balanced")`
> *Note: The `balanced` weight modifier intentionally compensates for the engineered minority `high` and `low` risk classes automatically.*

---

### Fraud Detector — Isolation Forest
**File:** `models/train_fraud.py` | **Location:** `app/routers/fraud.py`

Unsupervised anomaly detection. Learns what the dimensional envelope of a standard parametric claim looks like, and actively flags arbitrary statistical outliers. Avoids standard supervised binary classification to account for new unknown fraudulent attack vectors. 

**Training Set Injection Data:** 5,000 synthetic generated claims natively pre-contaminated with an exact 90% normal / 10% fraudulent distribution matrix.

**Feature Matrix Vectoring:**
| Matrix Feature | Outlier Metric Mapping |
|---|---|
| `gps_zone_match` | Mismatch → Direct strong geographic spoofing indicator |
| `claim_velocity_7d` | > 5 claims/week → Direct systemic exploitation patterns |
| `historical_zone_presence` | Low presence → Claiming in completely unfamiliar operational routing zones |
| `time_since_event_seconds` | < 5 min → Suspiciously perfect immediate filing behavior out of bounds of typical API latency profiles |
| `platform_activity_during_event` | < 20% → Not actually connected or accepting pings during the "supposed" parametric event |

**Runtime Configuration:** `IsolationForest(n_estimators=200, contamination=0.10)`
**Inference:** Computes the mathematical `score_samples()` float mapped cleanly to human-readable bounds. Hardcoded python-rule overrides intercept massive high-confidence variables (such as direct GPS injection mismatches) natively over the top of the AI layer.

---

## ⚡ Core Parametric Orchestration Pipeline (`/ml/trigger`)
**Location:** `app/routers/trigger.py`

The orchestration controller of GigShield. Routes inputs sequentially through the microservices natively in memory:

```mermaid
graph TD
    A[Trigger Input Payload] --> B(Step 1: Disruption Math)
    B --> C{Probability >= 0.39?}
    C -->|No| D[Status: no_disruption\n+ Llama3 Explainer]
    C -->|Yes| E(Step 2: Calculate Adaptive Threshold)
    E --> F(Step 3: Run Isolation Forest)
    F --> G{Fraud >= 0.60?}
    G -->|Yes| H[Status: rejected\n+ Llama3 Explainer]
    G -->|No| I(Step 4: Predict Income Loss Map)
    I --> J{Fraud < Adaptive Threshold?}
    J -->|Yes| K[Status: approved (Auto Payout)\n+ Llama3 Explainer]
    J -->|No| L[Status: pending_review\n+ Llama3 Explainer]
```

---

## 🤖 Large Language Model Explainability (Groq API)
**Location:** `app/services/ai_explainer.py`

Uses the heavily optimized **Groq API** inference layer executing the LLM baseplate (`llama3-8b-8192`) to actively generate human readable, completely professional parametric insurance adjuster rationale strings dynamically inside the orchestration loop natively.

**Implementation Caveats:**
1. Explicitly strictly prompted: The pipeline feeds the literal exact dimensional payload state values into the prompt, forcing the LLM to output accurate rationales without stochastic number hallucination.
2. Safe Failure States: The entire LLM call sequence is wrapped in a failover conditional. If `GROQ_API_KEY` is completely missing, revoked, rate-limited or the network faults, it gracefully degrades backwards onto a deterministic Python dictionary-mapping string concatenation rule-system, enforcing massive system reliability to ensure the backend parametric trigger API endpoint never drops.

---

## 🌐 Complete API Payload Reference

### Example POST `/ml/trigger` Endpoint Payload

```json
// Request
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

// Response
{
  "worker_id": "W_0012",
  "policy_id": "POL-2847",
  "zone_id": "Z_MUM_001",
  "payout_triggered": true,
  "payout_amount_inr": 700.0,
  "disruption_probability": 0.51,
  "disruption_confidence": 0.02,
  "disruption_type": "poor_air_quality",
  "fraud_score": 0.09,
  "fraud_cleared": true,
  "expected_income_loss_inr": 756.0,
  "decision_reason": "Auto-approved. Disruption: poor_air_quality (51% probability, confidence 2%). Estimated weekly loss: Rs.756. Payout: Rs.700.",
  "ai_explanation": "A severe air quality disruption was detected in the worker's zone with an AQI of 420, classified as hazardous by CPCB standards. Combined with a temperature of 46.5C, environmental conditions significantly impaired safe delivery operations. Fraud verification confirmed normal claim behaviour with a score of 0.09. An automatic parametric payout of Rs.700 has been issued in accordance with the active policy.",
  "model_metadata": {
    "risk_model": {
      "algorithm": "RandomForestClassifier",
      "overall_accuracy": 0.9856,
      "top_features": ["months_active", "zone_flood_risk", "zone_heat_risk"]
    },
    "fraud_model": {
      "algorithm": "IsolationForest",
      "type": "unsupervised_anomaly_detection",
      "fraud_recall": 0.64
    }
  },
  "status": "approved"
}
```

---

## 🧰 Technology & Vendor Abstractions Stack

| System Component | Technology Implementation Detail |
|---|---|
| **API Framework Layer** | `FastAPI` natively mounted onto `Uvicorn` asynchronous WSGI worker pools. |
| **Risk Matrix Algorithm** | `scikit-learn RandomForestClassifier` bounded to geometric feature importance mapping. |
| **Fraud & Anomaly Filter** | `scikit-learn IsolationForest` bound to continuous distribution curve heuristic limits. |
| **Income Shock Predictor** | Inline synchronous localized single-instance fitted `IsolationForest`. |
| **Generative Explainer AI** | Groq Llama 3 (`llama3-8b-8192`) routed synchronously per trigger query, with python fallback. |
| **Payload Data Verification** | Typed enforcement exclusively mapped using Python runtime typehinting bridged to Pydantic v2 schemas. |
| **Artifact State File Formatting** | Standardized `joblib` dumps mapping pickled memory matrix weights natively onto disk. |
| **Environment Variable Management** | Handled transparently by `pydantic-settings`. |

---

## Swagger Smoke Tests

These sample requests were validated against the current local ML service and can
be pasted directly into Swagger at `http://localhost:8000/docs`.

### POST `/ml/risk-score`

Request:

```json
{
  "worker_id": "W_TEST_001",
  "zone_id": "Z_DEL_001",
  "platform": "Swiggy",
  "months_active": 9,
  "avg_daily_hours": 8.5,
  "past_claims_count": 2,
  "zone_flood_risk": 0.32,
  "zone_heat_risk": 0.88,
  "plan_base_premium": 79,
  "plan_max_payout": 2000,
  "covered_event_count": 6,
  "avg_copay": 0.1
}
```

Response:

```json
{
  "risk_score": 0.9211,
  "risk_label": "medium",
  "risk_adjusted_reference_premium": 88.13,
  "reference_coverage_amount": 2000,
  "top_risk_factors": [
    "months_active",
    "avg_daily_hours",
    "past_claims_count"
  ]
}
```

### POST `/ml/premium`

Request:

```json
{
  "worker_id": "W_TEST_001",
  "plan_name": "standard",
  "plan_base_premium": 79,
  "plan_max_payout": 2000,
  "covered_event_count": 6,
  "avg_copay": 0.1,
  "risk_label": "medium",
  "risk_score": 0.72,
  "city_climate_risk": 0.55,
  "disruption_probability": 0.55,
  "vulnerability_score": 0.12
}
```

Response:

```json
{
  "worker_id": "W_TEST_001",
  "weekly_premium_inr": 95,
  "coverage_amount_inr": 2069.6,
  "pricing_tier": "Flex Shield",
  "breakdown": {
    "plan_name": "standard",
    "base_premium": 79,
    "risk_multiplier": 1.0596,
    "climate_multiplier": 1.099,
    "disruption_multiplier": 1.066,
    "vulnerability_multiplier": 1.0096,
    "coverage_richness_multiplier": 1.13,
    "price_floor": 65,
    "price_ceiling": 95,
    "avg_copay": 0.1,
    "covered_event_count": 6,
    "raw_premium_before_guardrails": 111.88
  }
}
```

### POST `/ml/fraud-score`

Normal claim request:

```json
{
  "claim_id": "CLM_TEST_001",
  "worker_id": "W_TEST_001",
  "gps_zone_match": true,
  "claim_velocity_7d": 1,
  "historical_zone_presence": 0.84,
  "time_since_event_seconds": 6400,
  "platform_activity_during_event": 0.78,
  "plan_name": "standard",
  "season": "monsoon",
  "event_type": "Heavy Rain",
  "plan_base_premium": 79,
  "plan_max_payout": 2000,
  "claimed_amount": 520,
  "claimed_amount_ratio": 0.26,
  "prior_rejections_90d": 0
}
```

Normal claim response:

```json
{
  "fraud_score": 0.45,
  "decision": "manual_review",
  "reason": "Moderate risk: anomaly flagged for review"
}
```

Suspicious claim request:

```json
{
  "claim_id": "CLM_TEST_002",
  "worker_id": "W_TEST_001",
  "gps_zone_match": false,
  "claim_velocity_7d": 7,
  "historical_zone_presence": 0.12,
  "time_since_event_seconds": 90,
  "platform_activity_during_event": 0.05,
  "plan_name": "premium",
  "season": "festival",
  "event_type": "Platform Outage",
  "plan_base_premium": 99,
  "plan_max_payout": 3500,
  "claimed_amount": 3200,
  "claimed_amount_ratio": 0.91,
  "prior_rejections_90d": 3
}
```

Suspicious claim response:

```json
{
  "fraud_score": 0.85,
  "decision": "auto_reject",
  "reason": "High fraud probability: GPS zone mismatch, High claim velocity (7 claims in 7 days), Claim filed within 5 min of event, Very low platform activity during event, Claim amount near policy maximum, Repeated recent rejections"
}
```

### POST `/ml/trigger`

Request:

```json
{
  "worker_id": "W_TEST_001",
  "zone_id": "Z_DEL_001",
  "policy_id": "POL_TEST_001",
  "temperature_celsius": 44,
  "rainfall_mm": 4,
  "aqi_score": 355,
  "wind_speed_kmh": 9,
  "gps_zone_match": true,
  "claim_velocity_7d": 1,
  "historical_zone_presence": 0.84,
  "time_since_event_seconds": 4200,
  "platform_activity_during_event": 0.74,
  "plan_name": "standard",
  "season": "summer",
  "event_type": "Poor AQI",
  "plan_base_premium": 79,
  "plan_max_payout": 2000,
  "claimed_amount": 600,
  "claimed_amount_ratio": 0.3,
  "prior_rejections_90d": 0,
  "worker_daily_orders": 15,
  "avg_income_per_order": 80,
  "risk_label": "medium"
}
```

Response:

```json
{
  "worker_id": "W_TEST_001",
  "policy_id": "POL_TEST_001",
  "zone_id": "Z_DEL_001",
  "payout_triggered": false,
  "payout_amount_inr": 0,
  "disruption_probability": 0.3925,
  "disruption_confidence": 0.215,
  "disruption_type": "compound",
  "fraud_score": 0.45,
  "fraud_cleared": true,
  "expected_income_loss_inr": 2802.45,
  "decision_reason": "Manual review required. Disruption confirmed (39%), but fraud score 0.45 exceeds review threshold (0.40) for this disruption level.",
  "ai_explanation": "This report details the decision made regarding a claim filed by a GigShield policyholder. The claim was flagged for manual review due to a compound disruption type, which was detected at a disruption probability of 39%. The weather conditions at the time of disruption included a temperature of 44.0C and rainfall of 4.0 mm, with an Air Quality Index (AQI) of 355, indicating poor air quality. Despite the disruption probability confirming a disruption, the fraud score of 0.45 out of 1.0 exceeded the review threshold for this disruption level, resulting in no payout being issued, with an estimated income loss of Rs.2802.45.",
  "model_metadata": {
    "risk_model": {
      "algorithm": "RandomForestClassifier",
      "overall_accuracy": 0.914,
      "class_f1": {
        "low": 0.8944,
        "medium": 0.919,
        "high": 0.9388
      },
      "top_features": [
        "months_active",
        "avg_daily_hours",
        "past_claims_count"
      ],
      "training_samples": 4000,
      "trained_at": "2026-03-17T08:58:52Z",
      "sklearn_version": "1.8.0"
    },
    "fraud_model": {
      "algorithm": "IsolationForest",
      "type": "unsupervised_anomaly_detection",
      "overall_accuracy": 0.9844,
      "fraud_recall": 0.922,
      "fraud_precision": 0.922,
      "fraud_f1": 0.922,
      "training_samples": 5000,
      "trained_at": "2026-03-17T08:59:09Z",
      "sklearn_version": "1.8.0"
    }
  },
  "status": "pending_review"
}
```
