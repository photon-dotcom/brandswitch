#!/usr/bin/env python3
"""
generate-descriptions.py — Batch-generate 2-sentence brand descriptions
using the Anthropic Message Batches API and claude-haiku-4-5-20251001.

Commands
--------
  prepare   Scan all brands-*.json, deduplicate by slug, write batch JSONL files
  submit    Show cost estimate, confirm, submit batches to the Batch API
  status    Check processing status of submitted batches (--watch to keep polling)
  merge     Download completed results; merge descriptions into all brand files
  run       Full pipeline: prepare → submit → poll → merge

Example
-------
  python3 scripts/generate-descriptions.py run --yes
  python3 scripts/generate-descriptions.py status --watch
"""

import argparse
import glob
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────

MODEL             = "claude-haiku-4-5-20251001"
MAX_TOKENS        = 120          # ~2 sentences; ~60–80 output tokens in practice
BATCH_SIZE        = 10_000       # Anthropic Batch API limit per submission
POLL_INTERVAL_SEC = 30           # seconds between status polls in --watch / run

# Pricing (USD per million tokens, Feb 2026)
PRICE_IN_PER_MTOK  = 0.80        # Haiku 4.5 input
PRICE_OUT_PER_MTOK = 4.00        # Haiku 4.5 output
BATCH_DISCOUNT     = 0.50        # 50 % off for Batch API

DATA_DIR     = Path("data")
STATE_FILE   = DATA_DIR / ".desc-batch-state.json"
RESULTS_FILE = DATA_DIR / ".desc-results.json"   # slug → description cache

# ── Utilities ─────────────────────────────────────────────────────────────────

def _load_dotenv(path: str = ".env") -> None:
    """Parse a .env file and set missing environment variables."""
    if not os.path.exists(path):
        return
    with open(path) as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip("\"'"))


def _get_client():
    """Return an authenticated Anthropic client, loading .env if needed."""
    _load_dotenv()
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        sys.exit(
            "ANTHROPIC_API_KEY is not set.\n"
            "Add it to .env or export it:  export ANTHROPIC_API_KEY=sk-ant-..."
        )
    try:
        import anthropic  # noqa: PLC0415
    except ImportError:
        sys.exit("anthropic SDK not found. Install it:  pip install anthropic")
    return anthropic.Anthropic(api_key=api_key)


def _load_state() -> dict:
    if not STATE_FILE.exists():
        sys.exit(
            f"State file not found: {STATE_FILE}\n"
            "Run 'prepare' first."
        )
    return json.loads(STATE_FILE.read_text())


def _save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2))


def _hr(char: str = "─", width: int = 62) -> str:
    return char * width


# ── Brand scanning ────────────────────────────────────────────────────────────

def _scan_brands() -> tuple[list[dict], int]:
    """
    Walk all brands-*.json files, deduplicate by slug.
    Returns (list_of_brands_needing_descriptions, number_of_files).
    Brands that already have a non-empty description in *any* market are skipped.
    """
    files = sorted(glob.glob(str(DATA_DIR / "brands-*.json")))
    if not files:
        sys.exit(f"No brands-*.json files found in {DATA_DIR}/")

    # First pass — collect slugs that already have a description anywhere
    has_desc: set[str] = set()
    for fp in files:
        with open(fp) as fh:
            for b in json.load(fh):
                if b.get("description", "").strip():
                    has_desc.add(b["slug"])

    # Second pass — collect unique slugs that still need one
    seen: set[str] = set()
    needs: list[dict] = []
    for fp in files:
        with open(fp) as fh:
            for b in json.load(fh):
                slug = b["slug"]
                if slug in seen or slug in has_desc:
                    continue
                seen.add(slug)
                needs.append({
                    "slug":       slug,
                    "name":       b.get("name", slug),
                    "domain":     b.get("domain", ""),
                    "categories": b.get("categories", []),
                })

    return needs, len(files)


def _build_prompt(brand: dict) -> str:
    """Craft a tight prompt for a 2-sentence brand description."""
    name   = brand["name"]
    domain = brand["domain"]
    cats   = brand["categories"]
    c1     = cats[0] if cats else "retail"
    c2     = f" and {cats[1]}" if len(cats) > 1 else ""
    return (
        f"{name} ({domain}) is a {c1}{c2} brand. "
        f"Write exactly 2 sentences: what they sell, and what makes them notable "
        f"or who they're for. Reply with only the 2 sentences, no preamble."
    )


# ── Cost estimation ────────────────────────────────────────────────────────────

def _estimate_cost(n: int) -> dict:
    """Rough cost estimate for n brands at batch-API pricing."""
    avg_in  = 55   # tokens per prompt (empirical)
    avg_out = 65   # tokens per 2-sentence output (empirical)
    in_cost  = n * avg_in  / 1_000_000 * PRICE_IN_PER_MTOK  * (1 - BATCH_DISCOUNT)
    out_cost = n * avg_out / 1_000_000 * PRICE_OUT_PER_MTOK * (1 - BATCH_DISCOUNT)
    return {
        "n":          n,
        "in_tokens":  n * avg_in,
        "out_tokens": n * avg_out,
        "in_cost":    in_cost,
        "out_cost":   out_cost,
        "total":      in_cost + out_cost,
    }


# ── Command: prepare ──────────────────────────────────────────────────────────

def cmd_prepare(args) -> None:
    """Scan brands, deduplicate by slug, write batch JSONL files and state."""
    force: bool = getattr(args, "force", False)

    if STATE_FILE.exists() and not force:
        state = json.loads(STATE_FILE.read_text())
        n     = state["total_brands"]
        nb    = len(state["batches"])
        print(f"State file already exists: {n:,} brands across {nb} batch(es).")
        print("Run 'submit' to proceed, or use --force to regenerate.")
        return

    print("Scanning brand files …")
    brands, n_files = _scan_brands()
    n = len(brands)
    print(f"  {n_files} market files")
    print(f"  {n:,} unique slugs need descriptions")

    est = _estimate_cost(n)
    print(f"  Estimated cost: ${est['total']:.2f} "
          f"(${est['in_cost']:.2f} in + ${est['out_cost']:.2f} out, "
          f"50 % batch discount applied)")

    chunks = [brands[i : i + BATCH_SIZE] for i in range(0, n, BATCH_SIZE)]
    print(f"  Splitting into {len(chunks)} batch(es) of up to {BATCH_SIZE:,}")

    batch_meta = []
    for i, chunk in enumerate(chunks):
        batch_file = DATA_DIR / f".desc-batch-{i}.jsonl"
        with open(batch_file, "w") as fh:
            for brand in chunk:
                req = {
                    "custom_id": brand["slug"],
                    "params": {
                        "model":      MODEL,
                        "max_tokens": MAX_TOKENS,
                        "messages": [
                            {"role": "user", "content": _build_prompt(brand)}
                        ],
                    },
                }
                fh.write(json.dumps(req, ensure_ascii=False) + "\n")

        batch_meta.append({
            "index":    i,
            "batch_id": None,
            "file":     str(batch_file),
            "status":   "pending",   # pending | submitted | in_progress | ended | merged
            "count":    len(chunk),
            "ok":       None,
            "errors":   None,
        })
        print(f"  Batch {i}: {len(chunk):,} requests → {batch_file.name}")

    state = {
        "prepared_at":  datetime.utcnow().isoformat() + "Z",
        "total_brands": n,
        "model":        MODEL,
        "batches":      batch_meta,
    }
    _save_state(state)
    print(f"\nState saved → {STATE_FILE}")
    print("Next step:  python3 scripts/generate-descriptions.py submit")


# ── Command: submit ────────────────────────────────────────────────────────────

def cmd_submit(args) -> None:
    """Display cost estimate, ask for confirmation, then submit pending batches."""
    yes: bool = getattr(args, "yes", False)
    state     = _load_state()
    pending   = [b for b in state["batches"] if b["status"] == "pending"]

    if not pending:
        print("No pending batches — all already submitted.")
        cmd_status(args)
        return

    n   = state["total_brands"]
    est = _estimate_cost(n)
    nb  = len(state["batches"])

    print()
    print(_hr())
    print("  Batch API submission plan")
    print(_hr())
    print(f"  Model              :  {MODEL}")
    print(f"  Unique brands      :  {n:,}")
    print(f"  Total batches      :  {nb}  ({BATCH_SIZE:,} max per batch)")
    print(f"  Pending batches    :  {len(pending)}")
    print(_hr("·"))
    print(f"  Est. input tokens  :  {est['in_tokens']:,}")
    print(f"  Est. output tokens :  {est['out_tokens']:,}")
    print(f"  Est. input cost    :  ${est['in_cost']:.2f}  (50 % batch discount)")
    print(f"  Est. output cost   :  ${est['out_cost']:.2f}  (50 % batch discount)")
    print(f"  Est. total cost    :  ${est['total']:.2f}")
    print(_hr())
    print()

    if not yes:
        answer = input("Submit to Anthropic Batch API? [y/N] ").strip().lower()
        if answer != "y":
            print("Aborted.")
            return

    client = _get_client()

    for b in pending:
        requests = []
        with open(b["file"]) as fh:
            for line in fh:
                requests.append(json.loads(line))

        print(f"  Submitting batch {b['index']} ({len(requests):,} requests) … ",
              end="", flush=True)
        batch   = client.messages.batches.create(requests=requests)
        b["batch_id"] = batch.id
        b["status"]   = "submitted"
        _save_state(state)
        print(f"OK  →  {batch.id}")

    print(f"\nAll {len(pending)} batch(es) submitted.")
    print("Next step:  python3 scripts/generate-descriptions.py status [--watch]")


# ── Command: status ────────────────────────────────────────────────────────────

def _check_status(state: dict, client) -> bool:
    """
    Fetch live status from the API, update state, print a table.
    Returns True when every batch is ended or merged.
    """
    changed = False
    refreshable = {"submitted", "in_progress"}

    print()
    print(_hr())
    print(f"  {'#':<4} {'Batch ID':<28} {'Status':<14} {'OK':>7} {'Err':>6}")
    print(_hr("·"))

    for b in state["batches"]:
        if b["batch_id"] and b["status"] in refreshable:
            live = client.messages.batches.retrieve(b["batch_id"])
            new_status = live.processing_status  # "in_progress" | "ended"
            if new_status != b["status"]:
                changed = True
            b["status"]  = new_status
            b["ok"]      = live.request_counts.succeeded
            b["errors"]  = live.request_counts.errored
        elif b["batch_id"] and b["status"] == "ended":
            # Already marked ended from a previous poll — just refresh counts if missing
            if b["ok"] is None:
                live     = client.messages.batches.retrieve(b["batch_id"])
                b["ok"]  = live.request_counts.succeeded
                b["errors"] = live.request_counts.errored
                changed  = True

        bid  = b["batch_id"] or "(not submitted)"
        ok   = b["ok"]     if b["ok"]     is not None else "—"
        err  = b["errors"] if b["errors"] is not None else "—"
        print(f"  {b['index']:<4} {bid:<28} {b['status']:<14} {str(ok):>7} {str(err):>6}")

    print(_hr())
    n_ended  = sum(1 for b in state["batches"] if b["status"] in ("ended", "merged"))
    n_merged = sum(1 for b in state["batches"] if b["status"] == "merged")
    total    = len(state["batches"])
    print(f"  {n_ended}/{total} ended · {n_merged}/{total} merged")
    print()

    if changed:
        _save_state(state)

    submitted = [b for b in state["batches"] if b["batch_id"]]
    return submitted and all(b["status"] in ("ended", "merged") for b in submitted)


def cmd_status(args) -> bool:
    """Print a status table; optionally keep polling with --watch."""
    watch: bool = getattr(args, "watch", False)
    state  = _load_state()
    client = _get_client()

    all_done = _check_status(state, client)

    if watch and not all_done:
        print(f"Watching … polling every {POLL_INTERVAL_SEC}s  (Ctrl-C to stop)")
        while not all_done:
            time.sleep(POLL_INTERVAL_SEC)
            state    = _load_state()          # reload in case another process updated it
            all_done = _check_status(state, client)

    if all_done:
        print("All batches have ended.")
        print("Next step:  python3 scripts/generate-descriptions.py merge")

    return all_done


# ── Command: merge ─────────────────────────────────────────────────────────────

def _sanitize(text: str) -> str:
    """Collapse whitespace; ensure the string ends with sentence punctuation."""
    text = " ".join(text.split())
    if text and text[-1] not in ".!?":
        text += "."
    return text


def cmd_merge(args) -> None:
    """Download results for ended batches and write descriptions into brand files."""
    state  = _load_state()
    client = _get_client()

    # Load any previously cached results
    results: dict[str, str] = {}
    if RESULTS_FILE.exists():
        results = json.loads(RESULTS_FILE.read_text())

    newly_downloaded = 0
    for b in state["batches"]:
        if b["status"] == "merged":
            print(f"  Batch {b['index']} already merged — skipping download.")
            continue
        if b["status"] != "ended":
            print(f"  Batch {b['index']} is '{b['status']}' (not ended) — skipping.")
            continue
        if not b["batch_id"]:
            print(f"  Batch {b['index']} has no batch_id — skipping.")
            continue

        print(f"  Downloading batch {b['index']} ({b['batch_id']}) … ", end="", flush=True)
        ok = errors = 0
        for result in client.messages.batches.results(b["batch_id"]):
            if result.result.type == "succeeded":
                content = result.result.message.content
                raw     = content[0].text if content else ""
                if raw.strip():
                    results[result.custom_id] = _sanitize(raw)
                    ok += 1
            else:
                errors += 1

        b["status"] = "merged"
        b["ok"]     = ok
        b["errors"] = errors
        newly_downloaded += ok
        _save_state(state)
        print(f"{ok:,} OK  ·  {errors} errors")

    if not results:
        print("No results available yet.")
        return

    # Persist the merged results cache
    RESULTS_FILE.write_text(json.dumps(results, indent=2, ensure_ascii=False))
    print(f"\n{len(results):,} descriptions cached → {RESULTS_FILE}")

    # Apply descriptions to every brand file
    brand_files = sorted(glob.glob(str(DATA_DIR / "brands-*.json")))
    total_updated = 0

    print(f"\nUpdating {len(brand_files)} brand files …")
    for fp in brand_files:
        with open(fp) as fh:
            brands = json.load(fh)

        updated = 0
        for b in brands:
            if not b.get("description", "").strip() and b["slug"] in results:
                b["description"] = results[b["slug"]]
                updated += 1

        if updated:
            with open(fp, "w", encoding="utf-8") as fh:
                json.dump(brands, fh, ensure_ascii=False, separators=(",", ":"))
            total_updated += updated
            market = Path(fp).stem.replace("brands-", "").upper()
            print(f"  {market:<4}  {updated:>6,} brands updated")

    print(_hr())
    print(f"  Total records updated: {total_updated:,}")
    coverage = len(results) / state["total_brands"] * 100 if state["total_brands"] else 0
    print(f"  Description coverage: {len(results):,} / {state['total_brands']:,} "
          f"unique slugs ({coverage:.1f} %)")


# ── Command: run (end-to-end pipeline) ────────────────────────────────────────

def cmd_run(args) -> None:
    """Convenience: prepare → submit → poll until done → merge."""
    print("=" * 62)
    print("  Step 1/4 — prepare")
    print("=" * 62)
    cmd_prepare(args)

    print()
    print("=" * 62)
    print("  Step 2/4 — submit")
    print("=" * 62)
    cmd_submit(args)

    print()
    print("=" * 62)
    print(f"  Step 3/4 — polling every {POLL_INTERVAL_SEC}s until all batches end")
    print("=" * 62)
    state  = _load_state()
    client = _get_client()
    while True:
        all_done = _check_status(state, client)
        if all_done:
            print("All batches complete.")
            break
        print(f"Still in progress … next check in {POLL_INTERVAL_SEC}s  (Ctrl-C to stop)")
        time.sleep(POLL_INTERVAL_SEC)
        state = _load_state()

    print()
    print("=" * 62)
    print("  Step 4/4 — merge")
    print("=" * 62)
    cmd_merge(args)

    print()
    print("All done!")


# ── CLI entry point ────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        prog="generate-descriptions.py",
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # prepare
    p = sub.add_parser("prepare", help="Scan brands and build batch JSONL files")
    p.add_argument("--force", action="store_true",
                   help="Overwrite existing state and JSONL files")

    # submit
    p = sub.add_parser("submit", help="Submit batches to the Anthropic Batch API")
    p.add_argument("--yes", "-y", action="store_true",
                   help="Skip the confirmation prompt")

    # status
    p = sub.add_parser("status", help="Check batch processing status")
    p.add_argument("--watch", "-w", action="store_true",
                   help=f"Keep polling every {POLL_INTERVAL_SEC}s until all batches end")

    # merge
    sub.add_parser("merge",
                   help="Download completed results and write descriptions into brand files")

    # run
    p = sub.add_parser("run", help="Full pipeline: prepare → submit → poll → merge")
    p.add_argument("--yes", "-y", action="store_true",
                   help="Skip the confirmation prompt in submit")
    p.add_argument("--force", action="store_true",
                   help="Overwrite existing state file in prepare")

    args = parser.parse_args()

    # Always run relative to the project root so DATA_DIR resolves correctly
    project_root = Path(__file__).resolve().parent.parent
    os.chdir(project_root)

    dispatch = {
        "prepare": cmd_prepare,
        "submit":  cmd_submit,
        "status":  cmd_status,
        "merge":   cmd_merge,
        "run":     cmd_run,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
