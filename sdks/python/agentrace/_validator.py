from __future__ import annotations

import json
from importlib.resources import files
from typing import Any, Dict, List, Optional

import jsonschema
from jsonschema import Draft7Validator


def _load_schema() -> dict:
    schema_text = files("agentrace.schemas").joinpath("v0.2.json").read_text(encoding="utf-8")
    return json.loads(schema_text)


_SCHEMA: Optional[dict] = None


def _get_schema() -> dict:
    global _SCHEMA
    if _SCHEMA is None:
        _SCHEMA = _load_schema()
    return _SCHEMA


def validate(trace: Dict[str, Any]) -> Optional[List[Dict[str, Any]]]:
    """Validate a trace dict against the AgentTrace v0.2 schema.

    Returns None if the trace is valid.
    Returns a list of error dicts if invalid. Each dict has:
        - "path": JSON path to the invalid field (e.g. "/steps/0/type")
        - "message": human-readable description of the error
    """
    schema = _get_schema()
    validator = Draft7Validator(schema)
    errors = sorted(validator.iter_errors(trace), key=lambda e: list(e.absolute_path))
    if not errors:
        return None
    return [
        {
            "path": "/" + "/".join(str(p) for p in e.absolute_path) if e.absolute_path else "/",
            "message": e.message,
        }
        for e in errors
    ]
