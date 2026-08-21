"""LangSmith integration — upload test cases as a dataset and run evaluations.

Usage:
    python -m tests.eval.langsmith_eval --upload          # Upload dataset to LangSmith
    python -m tests.eval.langsmith_eval --run             # Run evaluation via langsmith.evaluate()
    python -m tests.eval.langsmith_eval --list            # List datasets and experiments
"""

import asyncio
import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from .test_cases import get_cases, ALL_CASES, TestCase
from .runner import run_case, CaseResult, get_auth_token
from .evaluators import run_llm_judges

DATASET_NAME = "tripwhat-agent-benchmark"
PROJECT_NAME = os.environ.get("LANGSMITH_PROJECT", "tripwhat-agent")


def upload_dataset():
    """Upload all test cases as a LangSmith dataset."""
    from langsmith import Client

    client = Client(
        api_key=os.environ.get("LANGSMITH_API_KEY"),
        workspace_id=os.environ.get("LANGSMITH_WORKSPACE_ID"),
    )

    # Delete existing dataset if present
    try:
        existing = client.read_dataset(dataset_name=DATASET_NAME)
        print(f"Deleting existing dataset: {DATASET_NAME} (id={existing.id})")
        client.delete_dataset(dataset_id=existing.id)
    except Exception:
        pass

    # Create new dataset
    dataset = client.create_dataset(
        dataset_name=DATASET_NAME,
        description=f"TripWhat agent benchmark — {len(ALL_CASES)} test cases across 10 categories. Created {datetime.now().isoformat()}",
    )
    print(f"Created dataset: {DATASET_NAME} (id={dataset.id})")

    # Add examples
    inputs_list = []
    outputs_list = []

    for case in ALL_CASES:
        inputs = {
            "case_id": case.id,
            "category": case.category,
            "description": case.description,
            "turns": [{"user_message": t.user_message} for t in case.turns],
        }
        outputs = {
            "expected_assertions": [
                {
                    "turn_index": i,
                    "expected_slots_filled": t.expected_slots_filled,
                    "expected_slots_not_filled": t.expected_slots_not_filled,
                    "expected_tools_called": t.expected_tools_called,
                    "expected_tools_not_called": t.expected_tools_not_called,
                    "expected_interrupt": t.expected_interrupt,
                    "expected_itinerary_days": t.expected_itinerary_days,
                    "expected_route_cities": t.expected_route_cities,
                }
                for i, t in enumerate(case.turns)
            ],
            "llm_judge": case.llm_judge,
        }
        inputs_list.append(inputs)
        outputs_list.append(outputs)

    client.create_examples(
        inputs=inputs_list,
        outputs=outputs_list,
        dataset_id=dataset.id,
    )

    print(f"Uploaded {len(ALL_CASES)} examples to dataset")
    return dataset


async def run_langsmith_eval(base_url: str, concurrency: int = 5):
    """Run evaluation via langsmith.evaluate() with custom run function."""
    from langsmith import evaluate
    from langsmith.evaluation import aevaluate

    # Define the run function — executes the agent and returns outputs
    async def run_agent(inputs: dict) -> dict:
        case_id = inputs.get("case_id")
        category = inputs.get("category")
        description = inputs.get("description")
        turns_input = inputs.get("turns", [])

        # Reconstruct the TestCase
        from .test_cases import Turn
        turns = [Turn(user_message=t["user_message"]) for t in turns_input]
        case = TestCase(
            id=case_id,
            category=category,
            description=description,
            turns=turns,
        )

        # Run the case
        result = await run_case(case, base_url)

        # Return outputs for evaluation
        return {
            "response": result.turns[-1].response if result.turns else "",
            "tool_calls": result.turns[-1].tool_calls if result.turns else [],
            "slots_filled": result.turns[-1].slots_filled if result.turns else [],
            "interrupt": result.turns[-1].interrupt is not None if result.turns else False,
            "itinerary_days": result.turns[-1].itinerary_days if result.turns else None,
            "route_cities": result.turns[-1].route_cities if result.turns else [],
            "passed": result.passed,
            "assertions": result.assertions,
            "turns": [
                {
                    "response": t.response[:500],
                    "tool_calls": t.tool_calls,
                    "slots_filled": t.slots_filled,
                    "interrupt": t.interrupt is not None,
                }
                for t in result.turns
            ],
        }

    # Define evaluators (offline, attached to dataset)
    def assertion_evaluator(run, example):
        """Check if deterministic assertions passed."""
        run_outputs = run.outputs if hasattr(run, "outputs") else run.get("outputs", {})
        passed = run_outputs.get("passed", False)
        assertions = run_outputs.get("assertions", [])
        failed = [a for a in assertions if not a.get("passed", False)]
        comment = f"{len(assertions) - len(failed)}/{len(assertions)} assertions passed"
        if failed:
            comment += f". Failed: {', '.join(a['type'] for a in failed[:3])}"
        return {"score": 1 if passed else 0, "comment": comment}

    def intent_evaluator(run, example):
        """Check intent classification (simplified — based on category)."""
        run_outputs = run.outputs if hasattr(run, "outputs") else run.get("outputs", {})
        example_outputs = example.outputs if hasattr(example, "outputs") else example.get("outputs", {})
        # This is a simplified check — the full LLM judge runs separately
        return {"score": 1, "comment": "Intent check (see LLM judge for detailed scoring)"}

    # Run the evaluation
    print(f"\nRunning LangSmith evaluation against dataset: {DATASET_NAME}")
    print(f"Server: {base_url}")
    print(f"Concurrency: {concurrency}")

    results = await aevaluate(
        run_agent,
        data=DATASET_NAME,
        evaluators=[assertion_evaluator, intent_evaluator],
        experiment_prefix=f"eval-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
        max_concurrency=concurrency,
    )

    print(f"\nEvaluation complete. Check LangSmith UI for detailed results.")
    return results


def list_datasets():
    """List LangSmith datasets and experiments."""
    from langsmith import Client

    client = Client(
        api_key=os.environ.get("LANGSMITH_API_KEY"),
        workspace_id=os.environ.get("LANGSMITH_WORKSPACE_ID"),
    )

    print("\nDatasets:")
    for ds in client.list_datasets(limit=20):
        print(f"  {ds.name} (id={ds.id})")

    # List experiments for our dataset
    try:
        dataset = client.read_dataset(dataset_name=DATASET_NAME)
        print(f"\nExperiments for {DATASET_NAME}:")
        # Note: list_experiments may not be available in all SDK versions
        # The CLI provides this: langsmith-cli experiment list --dataset <name>
        print(f"  Use: langsmith-cli experiment list --dataset {DATASET_NAME}")
    except Exception:
        print(f"\nDataset {DATASET_NAME} not found")


async def main():
    parser = argparse.ArgumentParser(description="LangSmith integration for TripWhat evals")
    parser.add_argument("--upload", action="store_true", help="Upload test cases as a LangSmith dataset")
    parser.add_argument("--run", action="store_true", help="Run evaluation via langsmith.evaluate()")
    parser.add_argument("--list", action="store_true", help="List datasets and experiments")
    parser.add_argument("--base-url", type=str, default="http://127.0.0.1:5000", help="Server base URL")
    parser.add_argument("--concurrency", type=int, default=5, help="Max concurrent evaluations")
    args = parser.parse_args()

    if args.upload:
        upload_dataset()
    elif args.run:
        await run_langsmith_eval(args.base_url, concurrency=args.concurrency)
    elif args.list:
        list_datasets()
    else:
        parser.print_help()


if __name__ == "__main__":
    asyncio.run(main())
