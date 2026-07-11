"""
Tests unitaires du parsing/validation de la sortie LLM d'enrichissement.

Sans framework (cohérent avec les tests du projet) :
    .\\back\\venv\\Scripts\\python.exe -m back.legal_watch.tests.test_validation
"""
import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")  # console Windows cp1252

from pydantic import ValidationError

from back.legal_watch.enrichment import _validate
from back.legal_watch.schemas import EnrichmentResult

ALLOWED = {"delai_de_carence", "requalification_cdi", "indemnite_precarite"}

passed = 0
failed = 0


def check(name: str, fn) -> None:
    global passed, failed
    try:
        fn()
        passed += 1
        print(f"  ✓ {name}")
    except AssertionError as e:
        failed += 1
        print(f"  ✗ {name} — {e}")


VALID = {
    "summary": "La Cour retient que le non-respect du délai de carence justifie la requalification.",
    "legalDomain": "droit_travail_contrats_precaires",
    "concepts": ["delai_de_carence", "requalification_cdi"],
    "impactLevel": "haut",
    "isEvolution": True,
    "confidence": 0.85,
}


def test_valid_payload():
    result = _validate(json.dumps(VALID), ALLOWED)
    assert isinstance(result, EnrichmentResult)
    assert result.concepts == ["delai_de_carence", "requalification_cdi"]
    assert result.impactLevel == "haut"


def test_unknown_concept_rejected():
    bad = {**VALID, "concepts": ["delai_de_carence", "concept_invente"]}
    try:
        _validate(json.dumps(bad), ALLOWED)
        raise AssertionError("un concept hors liste fermée aurait dû être rejeté")
    except ValueError:
        pass


def test_invalid_json_rejected():
    try:
        _validate("{pas du json", ALLOWED)
        raise AssertionError("un JSON invalide aurait dû être rejeté")
    except json.JSONDecodeError:
        pass


def test_invalid_impact_rejected():
    bad = {**VALID, "impactLevel": "critique"}
    try:
        _validate(json.dumps(bad), ALLOWED)
        raise AssertionError("impactLevel hors énumération aurait dû être rejeté")
    except ValidationError:
        pass


def test_confidence_out_of_range_rejected():
    bad = {**VALID, "confidence": 1.7}
    try:
        _validate(json.dumps(bad), ALLOWED)
        raise AssertionError("confidence > 1 aurait dû être rejetée")
    except ValidationError:
        pass


def test_blank_summary_rejected():
    bad = {**VALID, "summary": "   "}
    try:
        _validate(json.dumps(bad), ALLOWED)
        raise AssertionError("summary vide aurait dû être rejeté")
    except ValidationError:
        pass


def test_missing_field_rejected():
    bad = dict(VALID)
    del bad["isEvolution"]
    try:
        _validate(json.dumps(bad), ALLOWED)
        raise AssertionError("champ manquant aurait dû être rejeté")
    except ValidationError:
        pass


def test_empty_concepts_accepted():
    # Liste vide = valide structurellement (l'item sera 'discarded' en aval).
    ok = {**VALID, "concepts": [], "legalDomain": "hors_perimetre"}
    result = _validate(json.dumps(ok), ALLOWED)
    assert result.concepts == []


if __name__ == "__main__":
    print("Tests validation sortie LLM (legal_watch)")
    check("payload valide accepté", test_valid_payload)
    check("concept hors liste fermée rejeté", test_unknown_concept_rejected)
    check("JSON invalide rejeté", test_invalid_json_rejected)
    check("impactLevel hors énumération rejeté", test_invalid_impact_rejected)
    check("confidence hors bornes rejetée", test_confidence_out_of_range_rejected)
    check("summary vide rejeté", test_blank_summary_rejected)
    check("champ manquant rejeté", test_missing_field_rejected)
    check("concepts vides acceptés (→ discarded)", test_empty_concepts_accepted)
    print(f"\n{passed} réussis, {failed} échoués")
    sys.exit(1 if failed else 0)
