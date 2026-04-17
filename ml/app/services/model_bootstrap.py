from __future__ import annotations

from pathlib import Path
import subprocess
import sys


MODELS_DIR = Path(__file__).resolve().parents[2] / "models"
SAVED_DIR = MODELS_DIR / "saved"
REQUIRED_ARTIFACTS = {
    "risk_model.joblib": "train_risk.py",
    "risk_model_metrics.json": "train_risk.py",
    "fraud_model.joblib": "train_fraud.py",
    "fraud_model_metrics.json": "train_fraud.py",
}

_bootstrap_attempted = False


def _run_training_script(script_name: str) -> None:
    script_path = MODELS_DIR / script_name
    subprocess.run(
        [sys.executable, str(script_path)],
        cwd=str(MODELS_DIR),
        check=True,
    )


def ensure_model_artifacts() -> list[str]:
    global _bootstrap_attempted

    missing = [name for name in REQUIRED_ARTIFACTS if not (SAVED_DIR / name).exists()]
    if not missing:
        return []

    if _bootstrap_attempted:
        return missing

    _bootstrap_attempted = True
    print(f"[ML Bootstrap] Missing model artifacts detected: {', '.join(missing)}")

    training_scripts = {REQUIRED_ARTIFACTS[name] for name in missing}
    for script_name in sorted(training_scripts):
        print(f"[ML Bootstrap] Training {script_name} to regenerate missing artifacts.")
        _run_training_script(script_name)

    return [name for name in REQUIRED_ARTIFACTS if not (SAVED_DIR / name).exists()]
