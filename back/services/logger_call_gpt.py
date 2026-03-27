import json
from datetime import datetime
from pathlib import Path

TOKEN_LOG_FILE = Path("gpt5_tokens_log.json")

def logger_gpt(response):
    """
    Log l'utilisation des tokens pour une réponse GPT-5.2 dans un fichier JSON.
    Cumule les logs précédents.
    """
    model = getattr(response, "model", "unknown")
    reasoning = getattr(response.reasoning, "effort", "none")
    verbosity = getattr(response.text, "verbosity", "medium")

    log_entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "model": model,
        "reasoning": reasoning,
        "verbosity": verbosity,
        "input_tokens": getattr(response.usage, "input_tokens", 0),
        "output_tokens": getattr(response.usage, "output_tokens", 0),
        "total_tokens": getattr(response.usage, "total_tokens", 0),
        "status": getattr(response, "status", "unknown"),
        "error": str(getattr(response, "error", None)) if getattr(response, "error", None) else None
    }

    # Lire le fichier existant ou créer une nouvelle structure
    if TOKEN_LOG_FILE.exists():
        try:
            with open(TOKEN_LOG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if not isinstance(data.get("logs"), list):
                    data["logs"] = []
        except json.JSONDecodeError:
            data = {"logs": []}
    else:
        data = {"logs": []}

    # Ajouter la nouvelle entrée
    data["logs"].append(log_entry)

    # Réécrire le fichier
    with open(TOKEN_LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ Log ajouté pour le modèle {model} avec reasoning={reasoning}")
