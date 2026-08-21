"""Evaluators — LLM-as-judge for subjective quality scoring.

Each evaluator takes a CaseResult and returns a score (1-5 or 0/1) with a comment.
Uses GPT-4o-mini for cost efficiency with structured output.
"""

import os
import json
from typing import Any
from dataclasses import dataclass

from .runner import CaseResult
from .test_cases import TestCase


@dataclass
class JudgeScore:
    """A single LLM-judge score."""
    evaluator: str
    score: float
    comment: str


# ============================================================
# LLM-as-Judge Evaluators
# ============================================================

# Use lazy initialization so we don't require openai if not judging
_judge_model = None


def _get_judge():
    global _judge_model
    if _judge_model is None:
        from langchain_openai import ChatOpenAI
        _judge_model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    return _judge_model


async def evaluate_response_quality(case: TestCase, result: CaseResult) -> JudgeScore:
    """Judge: Is the response helpful, conversational, and on-topic? (1-5)"""
    if not result.turns:
        return JudgeScore("response_quality", 0, "No turns completed")

    last_turn = result.turns[-1]
    if last_turn.error:
        return JudgeScore("response_quality", 0, f"Error: {last_turn.error}")

    judge = _get_judge()

    from langchain_core.messages import HumanMessage, SystemMessage

    system = SystemMessage(content=(
        "You are evaluating an AI travel agent's response quality. "
        "Score from 1-5 based on: helpfulness, conversational tone, staying on-topic for travel. "
        "5=excellent, 4=good, 3=acceptable, 2=poor, 1=very poor. "
        "Respond as JSON: {\"score\": <int>, \"comment\": \"<brief explanation>\"}"
    ))

    user = HumanMessage(content=(
        f"Test case: {case.description}\n"
        f"User message: {last_turn.user_message}\n"
        f"Agent response: {last_turn.response[:1000]}\n\n"
        f"Score the response quality (1-5):"
    ))

    try:
        resp = await judge.ainvoke([system, user])
        data = json.loads(resp.content)
        return JudgeScore("response_quality", float(data.get("score", 0)), data.get("comment", ""))
    except Exception as e:
        return JudgeScore("response_quality", 0, f"Judge error: {e}")


async def evaluate_intent_classification(case: TestCase, result: CaseResult) -> JudgeScore:
    """Judge: Did the agent correctly classify the user's intent? (0/1)

    Intent categories: chitchat, question, search, trip_planning, edit, post_build_question
    """
    if not result.turns:
        return JudgeScore("intent_classification", 0, "No turns completed")

    last_turn = result.turns[-1]
    if last_turn.error:
        return JudgeScore("intent_classification", 0, f"Error: {last_turn.error}")

    # Map category to expected intent
    intent_map = {
        "chitchat": "chitchat or deflection (non-travel should be deflected)",
        "questions": "answer a question / provide recommendations (NOT start trip planning)",
        "search": "search for places (NOT start trip planning)",
        "onboarding_single": "start trip planning (fill slots, propose route)",
        "onboarding_multi": "start trip planning (fill slots, ask for missing info)",
        "you_decide": "start trip planning with AI-chosen destination",
        "dates_edge": "handle dates correctly (fill or ask follow-up)",
        "route_flow": "confirm/reject route or build itinerary",
        "post_build_edit": "edit the existing itinerary",
        "post_build_question": "answer a question about the built trip (NOT edit)",
    }
    expected_intent = intent_map.get(case.category, "unknown")

    judge = _get_judge()

    from langchain_core.messages import HumanMessage, SystemMessage

    system = SystemMessage(content=(
        "You are evaluating whether an AI travel agent correctly classified the user's intent. "
        "The agent should: answer questions without starting trip planning, search without filling slots, "
        "deflect non-travel questions, and only start trip planning when the user actually wants to plan. "
        "Score 1 if the agent handled the intent correctly, 0 if it misclassified. "
        "Respond as JSON: {\"score\": <0 or 1>, \"comment\": \"<brief explanation>\"}"
    ))

    # Include tool calls for context
    tools_str = ", ".join(last_turn.tool_calls) if last_turn.tool_calls else "none"
    slots_str = ", ".join(last_turn.slots_filled) if last_turn.slots_filled else "none"

    user = HumanMessage(content=(
        f"Expected intent: {expected_intent}\n"
        f"User message: {last_turn.user_message}\n"
        f"Agent response: {last_turn.response[:800]}\n"
        f"Tools called: {tools_str}\n"
        f"Slots filled: {slots_str}\n"
        f"Interrupt triggered: {last_turn.interrupt is not None}\n\n"
        f"Did the agent correctly handle this intent? (0 or 1):"
    ))

    try:
        resp = await judge.ainvoke([system, user])
        data = json.loads(resp.content)
        return JudgeScore("intent_classification", float(data.get("score", 0)), data.get("comment", ""))
    except Exception as e:
        return JudgeScore("intent_classification", 0, f"Judge error: {e}")


async def evaluate_scope_compliance(case: TestCase, result: CaseResult) -> JudgeScore:
    """Judge: Did the agent stay within travel scope? (0/1)

    For chitchat cases with non-travel questions, the agent should deflect.
    For all other cases, the agent should stay on travel topic.
    """
    if not result.turns:
        return JudgeScore("scope_compliance", 0, "No turns completed")

    last_turn = result.turns[-1]
    if last_turn.error:
        return JudgeScore("scope_compliance", 0, f"Error: {last_turn.error}")

    judge = _get_judge()

    from langchain_core.messages import HumanMessage, SystemMessage

    if case.category == "chitchat":
        # For chitchat, check if the agent deflected non-travel questions
        system = SystemMessage(content=(
            "You are evaluating whether an AI travel agent correctly stayed within its scope. "
            "The agent is a TRAVEL planner only. For non-travel questions (math, programming, jokes, "
            "philosophy), it should politely deflect and redirect to travel. "
            "Score 1 if the agent stayed in scope (deflected non-travel), 0 if it answered the non-travel question. "
            "Respond as JSON: {\"score\": <0 or 1>, \"comment\": \"<brief explanation>\"}"
        ))
    else:
        # For other categories, check if the agent stayed on travel topic
        system = SystemMessage(content=(
            "You are evaluating whether an AI travel agent stayed within travel scope. "
            "Score 1 if the response is travel-related, 0 if it went off-topic. "
            "Respond as JSON: {\"score\": <0 or 1>, \"comment\": \"<brief explanation>\"}"
        ))

    user = HumanMessage(content=(
        f"User message: {last_turn.user_message}\n"
        f"Agent response: {last_turn.response[:800]}\n\n"
        f"Did the agent stay within travel scope? (0 or 1):"
    ))

    try:
        resp = await judge.ainvoke([system, user])
        data = json.loads(resp.content)
        return JudgeScore("scope_compliance", float(data.get("score", 0)), data.get("comment", ""))
    except Exception as e:
        return JudgeScore("scope_compliance", 0, f"Judge error: {e}")


async def evaluate_naturalness(case: TestCase, result: CaseResult) -> JudgeScore:
    """Judge: Is the response natural and not robotic/form-like? (1-5)"""
    if not result.turns:
        return JudgeScore("naturalness", 0, "No turns completed")

    last_turn = result.turns[-1]
    if last_turn.error:
        return JudgeScore("naturalness", 0, f"Error: {last_turn.error}")

    judge = _get_judge()

    from langchain_core.messages import HumanMessage, SystemMessage

    system = SystemMessage(content=(
        "You are evaluating whether an AI travel agent's response is natural and conversational. "
        "A good response sounds like a knowledgeable travel friend — not a form, not robotic, not overly verbose. "
        "Score from 1-5: 5=very natural, 4=natural, 3=acceptable, 2=robotic, 1=very robotic. "
        "Respond as JSON: {\"score\": <int>, \"comment\": \"<brief explanation>\"}"
    ))

    user = HumanMessage(content=(
        f"User message: {last_turn.user_message}\n"
        f"Agent response: {last_turn.response[:1000]}\n\n"
        f"Score the naturalness (1-5):"
    ))

    try:
        resp = await judge.ainvoke([system, user])
        data = json.loads(resp.content)
        return JudgeScore("naturalness", float(data.get("score", 0)), data.get("comment", ""))
    except Exception as e:
        return JudgeScore("naturalness", 0, f"Judge error: {e}")


# ============================================================
# Aggregate evaluator runner
# ============================================================

ALL_JUDGES = {
    "response_quality": evaluate_response_quality,
    "intent_classification": evaluate_intent_classification,
    "scope_compliance": evaluate_scope_compliance,
    "naturalness": evaluate_naturalness,
}


async def run_llm_judges(case: TestCase, result: CaseResult, judges: list[str] | None = None) -> dict[str, JudgeScore]:
    """Run all (or selected) LLM-as-judge evaluators on a case result."""
    if judges is None:
        judges = list(ALL_JUDGES.keys())

    scores: dict[str, JudgeScore] = {}
    for judge_name in judges:
        judge_fn = ALL_JUDGES.get(judge_name)
        if judge_fn:
            score = await judge_fn(case, result)
            scores[judge_name] = score

    return scores
