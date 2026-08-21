"""CLI entry point for running the evaluation benchmark.

Usage:
    python -m tests.eval.run_evals                          # Run all 80 cases
    python -m tests.eval.run_evals --category chitchat      # Run one category
    python -m tests.eval.run_evals --case chat-01           # Run one case
    python -m tests.eval.run_evals --no-judge               # Skip LLM-as-judge
    python -m tests.eval.run_evals --concurrency 10         # Parallel runs
    python -m tests.eval.run_evals --output results.json    # Save results
    python -m tests.eval.run_evals --base-url http://...    # Custom server URL
"""

import asyncio
import argparse
import json
import sys
import time
from pathlib import Path
from datetime import datetime

from .test_cases import get_cases, get_case, ALL_CASES, CATEGORIES
from .runner import run_cases, run_case, CaseResult
from .evaluators import run_llm_judges, JudgeScore


def print_summary(results: list[CaseResult], show_details: bool = False):
    """Print a summary table of results."""
    total = len(results)
    passed = sum(1 for r in results if r.passed)
    failed = total - passed

    print("\n" + "=" * 80)
    print(f"BENCHMARK RESULTS: {passed}/{total} passed ({passed/total*100:.1f}%)")
    print("=" * 80)

    # By category
    categories: dict[str, list[CaseResult]] = {}
    for r in results:
        categories.setdefault(r.category, []).append(r)

    print("\nBy Category:")
    print(f"{'Category':<25} {'Passed':>8} {'Total':>8} {'Rate':>8}")
    print("-" * 55)
    for cat, cat_results in sorted(categories.items()):
        cat_passed = sum(1 for r in cat_results if r.passed)
        cat_total = len(cat_results)
        rate = cat_passed / cat_total * 100 if cat_total > 0 else 0
        status = "✓" if cat_passed == cat_total else "✗"
        print(f"{status} {cat:<23} {cat_passed:>8} {cat_total:>8} {rate:>7.1f}%")

    # Show failures
    failures = [r for r in results if not r.passed]
    if failures:
        print(f"\n{'='*80}")
        print(f"FAILURES ({len(failures)} cases)")
        print(f"{'='*80}")
        for r in failures:
            print(f"\n  [{r.case_id}] {r.description}")
            for a in r.assertions:
                if not a["passed"]:
                    print(f"    ✗ {a['type']}: {a['message']}")

    # Show LLM judge scores if available
    judged = [r for r in results if r.llm_judge_scores]
    if judged:
        print(f"\n{'='*80}")
        print("LLM JUDGE SCORES")
        print(f"{'='*80}")
        print(f"{'Case ID':<15} {'Quality':>8} {'Intent':>8} {'Scope':>8} {'Natural':>8}")
        print("-" * 55)
        for r in judged:
            scores = r.llm_judge_scores
            q = scores.get("response_quality")
            i = scores.get("intent_classification")
            s = scores.get("scope_compliance")
            n = scores.get("naturalness")
            qv = f"{q.score:.1f}" if q else "-"
            iv = f"{i.score:.0f}" if i else "-"
            sv = f"{s.score:.0f}" if s else "-"
            nv = f"{n.score:.1f}" if n else "-"
            print(f"{r.case_id:<15} {qv:>8} {iv:>8} {sv:>8} {nv:>8}")

    # Timing
    total_time = sum(r.duration_seconds for r in results)
    print(f"\nTotal time: {total_time:.1f}s ({total_time/total:.1f}s/case avg)")

    return passed == total


def save_results(results: list[CaseResult], output_path: str):
    """Save results to a JSON file."""
    output = {
        "timestamp": datetime.now().isoformat(),
        "total": len(results),
        "passed": sum(1 for r in results if r.passed),
        "results": [],
    }

    for r in results:
        result_data = {
            "case_id": r.case_id,
            "category": r.category,
            "description": r.description,
            "passed": r.passed,
            "duration_seconds": r.duration_seconds,
            "assertions": r.assertions,
            "turns": [],
            "llm_judge_scores": {},
        }
        for t in r.turns:
            result_data["turns"].append({
                "user_message": t.user_message,
                "response": t.response[:500],
                "tool_calls": t.tool_calls,
                "slots_filled": t.slots_filled,
                "interrupt": t.interrupt is not None,
                "itinerary_days": t.itinerary_days,
                "route_cities": t.route_cities,
                "error": t.error,
                "timeout": t.timeout,
            })
        for name, score in r.llm_judge_scores.items():
            result_data["llm_judge_scores"][name] = {
                "score": score.score,
                "comment": score.comment,
            }
        output["results"].append(result_data)

    Path(output_path).write_text(json.dumps(output, indent=2, default=str))
    print(f"\nResults saved to: {output_path}")


async def progress_callback(completed: int, total: int, result: CaseResult):
    """Print progress as cases complete."""
    status = "✓" if result.passed else "✗"
    print(f"  [{completed}/{total}] {status} {result.case_id} ({result.category}) — {result.duration_seconds:.1f}s")


async def main():
    parser = argparse.ArgumentParser(description="Run the TripWhat agent evaluation benchmark")
    parser.add_argument("--category", type=str, default=None, help="Run only one category")
    parser.add_argument("--case", type=str, default=None, help="Run only one case by ID")
    parser.add_argument("--no-judge", action="store_true", help="Skip LLM-as-judge evaluation")
    parser.add_argument("--concurrency", type=int, default=2, help="Max concurrent test cases (default 2 to avoid rate limits)")
    parser.add_argument("--stagger", type=float, default=10.0, help="Seconds to stagger case starts (default 10s)")
    parser.add_argument("--output", type=str, default=None, help="Save results to JSON file")
    parser.add_argument("--base-url", type=str, default="http://127.0.0.1:5000", help="Server base URL")
    parser.add_argument("--judges", type=str, nargs="*", default=None, help="Specific judges to run")
    args = parser.parse_args()

    # Get test cases
    if args.case:
        case = get_case(args.case)
        if not case:
            print(f"Case '{args.case}' not found")
            sys.exit(1)
        cases = [case]
    elif args.category:
        cases = get_cases(args.category)
        if not cases:
            print(f"Category '{args.category}' not found. Available: {list(CATEGORIES.keys())}")
            sys.exit(1)
    else:
        cases = get_cases()

    print(f"\nTripWhat Agent Evaluation Benchmark")
    print(f"Server: {args.base_url}")
    print(f"Cases: {len(cases)}")
    print(f"Concurrency: {args.concurrency} (stagger: {args.stagger}s)")
    print(f"LLM Judge: {'disabled' if args.no_judge else 'enabled'}")
    print(f"{'='*80}\n")

    # Run all cases
    start = time.time()
    results = await run_cases(cases, args.base_url, concurrency=args.concurrency, progress_callback=progress_callback)
    elapsed = time.time() - start

    # Run LLM judges
    if not args.no_judge:
        print(f"\n{'='*80}")
        print("Running LLM-as-judge evaluations...")
        print(f"{'='*80}\n")
        for i, (case, result) in enumerate(zip(cases, results)):
            if case.llm_judge and not result.turns or (result.turns and result.turns[-1].error):
                continue
            if case.llm_judge:
                scores = await run_llm_judges(case, result, judges=args.judges)
                result.llm_judge_scores = scores
                print(f"  [{i+1}/{len(cases)}] Judged {result.case_id}")

    # Print summary
    all_passed = print_summary(results)

    # Save results
    if args.output:
        save_results(results, args.output)

    print(f"\nTotal elapsed: {elapsed:.1f}s")
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    asyncio.run(main())
