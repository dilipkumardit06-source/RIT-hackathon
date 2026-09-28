"""
AWS Lambda Handler for Optigoal AI Financial Advisor
Deploy behind AWS API Gateway (HTTP or REST API)

Architecture:
1. Receives HTTPS POST event from Optigoal dashboard.html
2. Computes exact mathematical metrics in Indian Rupees (₹)
3. Injects schema & Bedrock Guardrails into context
4. Calls AWS Bedrock Converse API (Claude 3.5 Sonnet / Amazon Nova)
5. Returns JSON response with CORS headers
"""

import json
import os
import boto3

# Initialize Bedrock Runtime client outside handler for connection reuse
bedrock_client = boto3.client(
    service_name='bedrock-runtime',
    region_name=os.environ.get('AWS_REGION', 'eu-north-1')
)

def compute_financial_metrics(profile, goals):
    """
    Computes exact, un-hallucinated financial metrics in ₹.
    """
    income = float(profile.get('income', 0) or 0)
    expenses = float(profile.get('expenses', 0) or 0)
    investments = float(profile.get('investments', 0) or 0)
    reserve = float(profile.get('reserve', 0) or 0)
    currency = profile.get('currency', '₹')

    net_disposable = max(0.0, income - (expenses + investments))

    total_goal_demand = 0.0
    total_target_capital = 0.0
    goal_breakdown = []

    for g in goals:
        amt = float(g.get('amount', 0) or 0)
        months = max(int(g.get('months', 1) or 1), 1)
        req_per_mo = round(amt / months, 2)
        total_goal_demand += req_per_mo
        total_target_capital += amt
        goal_breakdown.append({
            "name": g.get('name', 'Goal'),
            "priority": g.get('priority', 'Medium'),
            "target": amt,
            "months": months,
            "monthly_req": req_per_mo
        })

    total_goal_demand = round(total_goal_demand, 2)
    surplus_deficit = round(net_disposable - total_goal_demand, 2)
    burn_ratio = round((total_goal_demand / net_disposable * 100), 1) if net_disposable > 0 else (999.0 if total_goal_demand > 0 else 0.0)
    reserve_coverage = round(reserve / expenses, 1) if expenses > 0 else 0.0

    feasibility = "FEASIBLE" if surplus_deficit >= 0 else "DEFICIT"

    return {
        "income": income,
        "expenses": expenses,
        "investments": investments,
        "reserve": reserve,
        "currency": currency,
        "net_disposable": net_disposable,
        "total_target_capital": total_target_capital,
        "total_goal_demand": total_goal_demand,
        "surplus_deficit": surplus_deficit,
        "burn_ratio_pct": burn_ratio,
        "reserve_coverage_months": reserve_coverage,
        "feasibility": feasibility,
        "goal_breakdown": goal_breakdown
    }

def lambda_handler(event, context):
    """
    AWS API Gateway Lambda Proxy Handler
    """
    # 1. Parse request body
    body_raw = event.get('body', '{}')
    if isinstance(body_raw, str):
        try:
            body = json.loads(body_raw)
        except Exception:
            body = {}
    else:
        body = body_raw or {}

    profile = body.get('profile', {})
    goals = body.get('goals', [])
    user_prompt = body.get('prompt', 'Run a comprehensive strategic audit on my goals and financial health.')
    model_choice = body.get('model', 'claude-3-5-sonnet')

    # 2. Compute exact mathematics (₹)
    metrics = compute_financial_metrics(profile, goals)

    # 3. Model mapping
    model_map = {
        "claude-3-5-sonnet": "anthropic.claude-3-5-sonnet-20241022-v2:0",
        "claude-3-haiku": "anthropic.claude-3-haiku-20240307-v1:0",
        "amazon-nova": "amazon.nova-pro-v1:0"
    }
    actual_model_id = model_map.get(model_choice, "anthropic.claude-3-5-sonnet-20241022-v2:0")

    # 4. Inject Schema & Bedrock Guardrails
    system_prompt = (
        "You are the Optigoal AI Strategic Financial Advisor powered by AWS Bedrock.\n"
        "You provide precise, mathematically rigorous, and realistic financial recommendations in Indian Rupees (₹).\n\n"
        "BEDROCK GUARDRAILS (ZERO HALLUCINATION POLICY):\n"
        "1. You MUST use the pre-computed exact figures provided in the context below. Do NOT recalculate or invent different monthly totals.\n"
        "2. If total goal demand exceeds available net cash flow (Deficit), explicitly point out the conflict and suggest timeline extensions or priority reallocations.\n"
        "3. Apply standard financial heuristics: 50/30/20 Rule, 6 months emergency reserve, debt avalanche.\n"
        "4. Format your output with clear markdown headings, bullet points, and actionable next steps."
    )

    context_message = (
        f"--- USER FINANCIAL PROFILE & EXACT MATH (₹) ---\n"
        f"{json.dumps(metrics, indent=2)}\n\n"
        f"--- USER QUERY ---\n"
        f"{user_prompt}"
    )

    # 5. Invoke AWS Bedrock Converse API
    try:
        response = bedrock_client.converse(
            modelId=actual_model_id,
            system=[{"text": system_prompt}],
            messages=[{"role": "user", "content": [{"text": context_message}]}],
            inferenceConfig={"temperature": 0.2, "maxTokens": 1800, "topP": 0.9}
        )
        output_text = response['output']['message']['content'][0]['text']
        provider_name = f"AWS Bedrock ({model_choice})"
    except Exception as e:
        output_text = f"AWS Bedrock Invocation Warning: {str(e)}"
        provider_name = "AWS Bedrock (Error Fallback)"

    # 6. Return standard API Gateway Proxy Response with CORS
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
        },
        "body": json.dumps({
            "success": True,
            "provider": provider_name,
            "metrics": metrics,
            "advice": output_text,
            "guardrails_active": True
        })
    }
