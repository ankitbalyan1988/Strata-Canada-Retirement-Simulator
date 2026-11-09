import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Track Gemini API quota status to prevent cascading 429 errors when free-tier daily quota is reached
let geminiQuotaExhaustedUntil: number = 0;

function isGeminiQuotaExhausted(): boolean {
  return Date.now() < geminiQuotaExhaustedUntil;
}

function handleGeminiError(endpoint: string, error: any): boolean {
  const msg = String(error?.message || '');
  const status = error?.status || error?.code;
  const isQuota = status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || msg.includes('Quota exceeded');
  if (isQuota) {
    // Cooldown for 30 minutes to cleanly serve local actuarial engine without failing network calls
    geminiQuotaExhaustedUntil = Date.now() + 30 * 60 * 1000;
    return true;
  }
  return false;
}

// API: Generate Canadian Retirement Persona from natural language prompt
app.post('/api/generate-persona', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'A descriptive persona prompt is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || isGeminiQuotaExhausted()) {
      // Fallback parser if API key is not present or quota exhausted
      const fallbackPersona = generateRuleBasedFallbackPersona(prompt);
      return res.json({ persona: fallbackPersona, source: 'heuristic' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const systemInstruction = `You are an expert Canadian financial planner and actuary specializing in CRA tax rules, RRSP, TFSA, FHSA, CPP, and OAS.
Your task is to take a user's natural language persona description (e.g. "A 28yo software engineer in Toronto earning $120k with $30k TFSA aiming to retire at 55" or "A married teacher couple in Montreal...") and synthesize a complete, realistic, mathematically sound Canadian retirement profile.

Rules:
1. Ensure province is a valid 2-letter Canadian code: 'ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', or 'PE'.
2. Account balances & contributions must reflect realistic Canadian norms and CRA limits ($7k TFSA, $8k FHSA up to $40k max, RRSP 18% of income up to $32.5k).
3. If the prompt describes a married couple or spouse, set maritalStatus to "married" and populate the spouse object. Otherwise set maritalStatus to "single" (which represents single/divorced individuals).
4. If the prompt describes possible layoffs or wage drops, configure the careerDisruption object.
5. Return ONLY valid JSON adhering to the requested format.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Generate a Canadian retirement persona JSON based on this description: "${prompt}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response received from Gemini API');
    }

    const parsed = JSON.parse(responseText);
    const sanitized = sanitizePersona(parsed, prompt);
    return res.json({ persona: sanitized, source: 'gemini-3.8-flash' });
  } catch (error: any) {
    handleGeminiError('/api/generate-persona', error);
    // Provide graceful heuristic fallback if Gemini call fails
    try {
      const fallbackPersona = generateRuleBasedFallbackPersona(req.body?.prompt || '');
      return res.json({ persona: fallbackPersona, source: 'heuristic_fallback' });
    } catch {
      return res.status(500).json({ error: 'Failed to generate persona. Please try again.' });
    }
  }
});

// API: Explain Ledger & Milestone Table Calculation with Gemini AI
app.post('/api/explain-ledger-value', async (req: Request, res: Response) => {
  try {
    const { question, selectedAge, selectedMetric, rowData, planContext } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'A question or calculation inquiry is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || isGeminiQuotaExhausted()) {
      const fallback = generateRuleBasedLedgerExplanation(question, selectedAge, selectedMetric, rowData, planContext);
      return res.json({ explanation: fallback, source: 'actuarial_heuristic' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const systemInstruction = `You are an expert Canadian retirement actuary, Certified Financial Planner (CFP), and CRA tax law specialist.
Your role is to explain numbers, formulas, and milestones from a user's Canadian Annual Simulation Ledger (which models RRSP/RRIF, TFSA, FHSA, Non-Reg, CPP, OAS, Clawbacks, Real Estate, and Provincial Taxes).

When answering:
1. Provide a direct, plain-English summary explaining what the number represents.
2. State the precise mathematical or actuarial formula used in Canadian retirement calculations (e.g. CRA tax brackets, RRIF mandatory minimum factor 1/(90-age), CPP 7.2%/yr early reduction or 8.4%/yr delayed enhancement, OAS clawback 15% above threshold $93,208 indexed, compounding return net of yield drag).
3. Provide a step-by-step math breakdown plugging in the user's concrete plan numbers for that age/year.
4. Provide strategic contextual guidance on how this specific calculation impacts their retirement success, tax bracket efficiency, government benefit preservation, and longevity buffer.
5. Return 2-3 dynamic follow-up questions tailored to this user's situation.

Return ONLY a valid JSON object with keys:
- summary: string
- formula: string
- mathBreakdown: array of strings (each string is one numbered step or arithmetic calculation)
- contextualGuidance: string (actionable advice and strategy implications)
- suggestedFollowUps: array of strings (2-3 questions)`;

    const promptContext = `
User Question: "${question}"
Target Age / Milestone: ${selectedAge ? `Age ${selectedAge}` : 'General Ledger Question'}
Target Metric: ${selectedMetric || 'Not specified'}

User's Plan Inputs & Assumptions:
- Current Age: ${planContext?.currentAge}
- Target Retirement Age: ${planContext?.retirementAge}
- Life Expectancy: ${planContext?.lifeExpectancy}
- Province of Residence: ${planContext?.province} (determines provincial tax brackets)
- Marital Status: ${planContext?.isMarried ? 'Married / Common-Law (with Pension Income Splitting)' : 'Single / Divorced'}
- Drawdown Strategy: ${planContext?.drawdownStrategy || 'tax_efficient'}
- Inflation Rate: ${planContext?.inflationRate}% per year
- Employment Income: $${planContext?.currentAnnualIncome?.toLocaleString()}
- Target Annual Retirement Spending (today's $): $${planContext?.targetRetirementSpendingToday?.toLocaleString()}

Specific Year Simulation Row Data:
${JSON.stringify(rowData || {}, null, 2)}
`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI generation timeout - transitioning to actuarial heuristic')), 15000)
    );

    const geminiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptContext,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW
        }
      }
    });

    const response = await Promise.race([geminiPromise, timeoutPromise]);

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response from Gemini API');
    }

    const parsed = JSON.parse(responseText);
    return res.json({ explanation: parsed, source: 'gemini-3.8-flash' });
  } catch (error: any) {
    handleGeminiError('/api/explain-ledger-value', error);
    const fallback = generateRuleBasedLedgerExplanation(
      req.body?.question || '',
      req.body?.selectedAge,
      req.body?.selectedMetric,
      req.body?.rowData,
      req.body?.planContext
    );
    return res.json({ explanation: fallback, source: 'actuarial_heuristic_fallback' });
  }
});

// API: Generate AI Narrative Insights for What-If Scenarios
app.post('/api/what-if-narrative', async (req: Request, res: Response) => {
  try {
    const { scenarioName, settings, metrics, planContext, customQuestion } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || isGeminiQuotaExhausted()) {
      const fallback = generateRuleBasedWhatIfNarrative(scenarioName, settings, metrics, planContext, customQuestion);
      return res.json({ narrative: fallback, source: 'actuarial_heuristic' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const systemInstruction = `You are a distinguished Canadian retirement actuary, Certified Financial Planner (CFP), and macroeconomic risk specialist.
Your task is to generate actionable, plain-language narrative insights analyzing a user's test scenario in their Canadian retirement What-If sensitivity model.

The model evaluates variations in:
- Investment returns (nominal ±2%)
- Real estate appreciation (±2%)
- Inflation rate (CPI ±2%)

In your response:
1. Provide a professional Scenario Title & Risk Rating ("low" | "moderate" | "high" | "critical") with a 1-sentence risk label.
2. Deliver an Executive Summary assessing the core macro dynamics and overall plan survivability.
3. Assess Asset Safety & Vulnerability:
   - Identify which Canadian assets are resilient (e.g. TFSA tax-free compounding, CPI-indexed CPP/OAS, Primary Residence PRE).
   - Identify which assets are strained or vulnerable (e.g. RRSP/RRIF purchasing power loss, non-reg dividend tax drag, market sequence-of-returns).
   - Characterize sequence-of-returns and capital longevity risk level.
4. Explain Milestone Velocity Impacts: Detail how the Crossover point (passive returns outgrowing expenses) and Coast FIRE (zero-contribution viability) are accelerated or delayed.
5. Provide 2-3 Actionable Canadian Remediation Tactics: Concrete, numbered steps (e.g., TFSA vs RRSP prioritization, delaying CPP/OAS to 70 for 8.4%/yr CPI-indexed boost, tax bracket drawdown adjustments).
6. Explain Projection Limits & Model Boundaries: Acknowledge the limits of the simulation (e.g., assumes static macro shift over full lifespan, real-world spending flexibility, tax bracket lag).
${customQuestion ? `7. If a customQuestion is provided ("${customQuestion}"), provide a dedicated, concise direct answer under the "customAnswer" field.` : ''}

Return ONLY valid JSON matching this structure:
{
  "scenarioTitle": string,
  "riskRating": "low" | "moderate" | "high" | "critical",
  "riskLabel": string,
  "summary": string,
  "assetSafetyAnalysis": {
    "safeAssets": string[],
    "vulnerableAssets": string[],
    "sequenceRiskLevel": string
  },
  "milestoneImpactSummary": string,
  "remediationTactics": string[],
  "projectionLimits": string,
  "customAnswer": string
}`;

    const promptContext = `
Scenario Tested: "${scenarioName || 'Custom Scenario'}"
What-If Deltas:
- Investment Return Delta: ${settings?.returnDelta >= 0 ? '+' : ''}${settings?.returnDelta ?? 0}% (Effective: ${metrics?.effectiveRates?.whatIfReturn ?? 'N/A'}%)
- Home Appreciation Delta: ${settings?.appreciationDelta >= 0 ? '+' : ''}${settings?.appreciationDelta ?? 0}% (Effective: ${metrics?.effectiveRates?.whatIfAppreciation ?? 'N/A'}%)
- Inflation Rate Delta: ${settings?.inflationDelta >= 0 ? '+' : ''}${settings?.inflationDelta ?? 0}% (Effective: ${metrics?.effectiveRates?.whatIfInflation ?? 'N/A'}%)

Simulation Impacts:
- Crossover Point: Base Age ${metrics?.crossoverImpact?.baselineAge ?? 'N/A'} -> Scenario Age ${metrics?.crossoverImpact?.whatIfAge ?? 'N/A'} (${metrics?.crossoverImpact?.ageDelta !== null && metrics?.crossoverImpact?.ageDelta !== undefined ? `${metrics.crossoverImpact.ageDelta > 0 ? `+${metrics.crossoverImpact.ageDelta} yrs delayed` : `${metrics.crossoverImpact.ageDelta} yrs earlier`}` : 'Unchanged'})
- Coast FIRE: Base Age ${metrics?.coastFireImpact?.baselineAge ?? 'N/A'} -> Scenario Age ${metrics?.coastFireImpact?.whatIfAge ?? 'N/A'} (${metrics?.coastFireImpact?.ageDelta !== null && metrics?.coastFireImpact?.ageDelta !== undefined ? `${metrics.coastFireImpact.ageDelta > 0 ? `+${metrics.coastFireImpact.ageDelta} yrs delayed` : `${metrics.coastFireImpact.ageDelta} yrs earlier`}` : 'Unchanged'})
- Monthly Cashflow at Retirement: Base $${metrics?.retirementCashflow?.baselineNominalMonthly?.toLocaleString() ?? 0}/mo -> Scenario $${metrics?.retirementCashflow?.whatIfNominalMonthly?.toLocaleString() ?? 0}/mo (${metrics?.retirementCashflow?.deltaNominalMonthly >= 0 ? '+' : ''}$${metrics?.retirementCashflow?.deltaNominalMonthly?.toLocaleString() ?? 0}/mo, real purchasing power $${metrics?.retirementCashflow?.whatIfRealMonthly?.toLocaleString() ?? 0}/mo)
- Retirement Net Worth: Base $${metrics?.retirementNetWorth?.baseline?.toLocaleString() ?? 0} -> Scenario $${metrics?.retirementNetWorth?.whatIf?.toLocaleString() ?? 0} (${metrics?.retirementNetWorth?.percentDelta >= 0 ? '+' : ''}${metrics?.retirementNetWorth?.percentDelta?.toFixed(1) ?? '0.0'}%)
- Plan Solvency: ${planContext?.isFullyFunded ? '100% Fully Funded through life expectancy' : `Depletes at Age ${planContext?.depletionAge ?? 'Early'}`}

User Household Context:
- Client: ${planContext?.userName || 'Client'}
- Current Age: ${planContext?.currentAge}, Target Retirement Age: ${planContext?.retirementAge}, Life Expectancy: ${planContext?.lifeExpectancy}
- Province: ${planContext?.province}
- Marital Status: ${planContext?.isMarried ? 'Married' : 'Single'}
- Home Ownership: ${planContext?.hasHome ? `Owns property ($${planContext?.homeValue?.toLocaleString() || 'N/A'})` : 'Renting'}
- Portfolio Mix: RRSP $${planContext?.rrspBalance?.toLocaleString() || 0}, TFSA $${planContext?.tfsaBalance?.toLocaleString() || 0}, Non-Reg $${planContext?.nonRegBalance?.toLocaleString() || 0}
${customQuestion ? `User's Specific Query on this Scenario: "${customQuestion}"` : ''}
`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI generation timeout - fallback to actuarial heuristic')), 15000)
    );

    const geminiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptContext,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW
        }
      }
    });

    const response = await Promise.race([geminiPromise, timeoutPromise]);
    const responseText = response.text;
    if (!responseText) throw new Error('Empty response from Gemini API');

    const parsed = JSON.parse(responseText);
    return res.json({ narrative: parsed, source: 'gemini-3.8-flash' });
  } catch (error: any) {
    handleGeminiError('/api/what-if-narrative', error);
    const fallback = generateRuleBasedWhatIfNarrative(
      req.body?.scenarioName,
      req.body?.settings,
      req.body?.metrics,
      req.body?.planContext,
      req.body?.customQuestion
    );
    return res.json({ narrative: fallback, source: 'actuarial_heuristic_fallback' });
  }
});

function sanitizePersona(raw: any, prompt: string) {
  const fallback = generateRuleBasedFallbackPersona(prompt);
  if (!raw || typeof raw !== 'object') return fallback;

  const validProvinces = ['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE'];
  const province = validProvinces.includes(raw.province) ? raw.province : fallback.province;
  const maritalStatus = raw.maritalStatus === 'married' ? 'married' : 'single';

  const currentAge = typeof raw.currentAge === 'number' && raw.currentAge >= 18 && raw.currentAge <= 75 ? Math.round(raw.currentAge) : fallback.currentAge;
  const retirementAge = typeof raw.retirementAge === 'number' && raw.retirementAge > currentAge && raw.retirementAge <= 80 ? Math.round(raw.retirementAge) : fallback.retirementAge;
  const lifeExpectancy = typeof raw.lifeExpectancy === 'number' && raw.lifeExpectancy > retirementAge ? Math.round(raw.lifeExpectancy) : Math.max(85, retirementAge + 15);

  const num = (v: any, def: number, min = 0, max = 5000000) => {
    const parsed = Number(v);
    return isNaN(parsed) ? def : Math.min(max, Math.max(min, parsed));
  };

  const currentAnnualIncome = num(raw.currentAnnualIncome, fallback.currentAnnualIncome, 10000, 2000000);
  const targetRetirementSpendingToday = num(raw.targetRetirementSpendingToday, Math.round(currentAnnualIncome * 0.65), 10000, 1000000);

  const persona: any = {
    maritalStatus,
    currentAge,
    retirementAge,
    lifeExpectancy,
    province,
    currentAnnualIncome,
    incomeGrowthRate: num(raw.incomeGrowthRate, 2.1, -10, 15),
    targetRetirementSpendingToday,
    rrspBalance: num(raw.rrspBalance, fallback.rrspBalance, 0),
    tfsaBalance: num(raw.tfsaBalance, fallback.tfsaBalance, 0),
    fhsaBalance: num(raw.fhsaBalance, fallback.fhsaBalance, 0, 40000),
    nonRegBalance: num(raw.nonRegBalance, fallback.nonRegBalance, 0),
    rrspAnnualContribution: num(raw.rrspAnnualContribution, fallback.rrspAnnualContribution, 0, 32490),
    tfsaAnnualContribution: num(raw.tfsaAnnualContribution, fallback.tfsaAnnualContribution, 0, 7000),
    fhsaAnnualContribution: num(raw.fhsaAnnualContribution, fallback.fhsaAnnualContribution, 0, 8000),
    nonRegAnnualContribution: num(raw.nonRegAnnualContribution, fallback.nonRegAnnualContribution, 0),
    fhsaIntent: raw.fhsaIntent === 'home_purchase' ? 'home_purchase' : 'rollover_to_rrsp',
    fhsaHomePurchaseAge: num(raw.fhsaHomePurchaseAge, currentAge + 4, currentAge, 71),
    cppStartAge: num(raw.cppStartAge, 65, 60, 70),
    cppEstimatedPercentOfMax: num(raw.cppEstimatedPercentOfMax, 75, 0, 100),
    cppCalculationMethod: raw.cppCalculationMethod === 'service_canada' ? 'service_canada' : 'percentage',
    cppServiceCanadaEstimateAt65: num(raw.cppServiceCanadaEstimateAt65, 917, 0, 3000),
    oasStartAge: num(raw.oasStartAge, 65, 65, 70),
    oasEligibleYearsInCanada: num(raw.oasEligibleYearsInCanada, 40, 0, 40),
    preRetirementReturn: num(raw.preRetirementReturn, 6.2, 0, 15),
    postRetirementReturn: num(raw.postRetirementReturn, 4.8, 0, 15),
    inflationRate: num(raw.inflationRate, 2.1, 0, 10),
    nonRegYieldTaxRate: num(raw.nonRegYieldTaxRate, 1.2, 0, 5),
    drawdownStrategy: (['tax_efficient', 'rrsp_meltdown', 'proportional', 'tfsa_first'].includes(raw.drawdownStrategy)) ? raw.drawdownStrategy : 'tax_efficient',
  };

  const rawRE = raw.realEstate || {};
  const ownsHome = typeof rawRE.ownsHome === 'boolean' ? rawRE.ownsHome : true;
  persona.realEstate = {
    ownsHome,
    costOfHome: num(rawRE.costOfHome, 650000, 50000),
    currentMarketValue: num(rawRE.currentMarketValue, 750000, 50000),
    downPayment: num(rawRE.downPayment, 130000, 0),
    mortgageInterestRate: num(rawRE.mortgageInterestRate, 4.79, 1, 15),
    mortgageTermYears: num(rawRE.mortgageTermYears, 25, 5, 35),
    mortgageStartYear: num(rawRE.mortgageStartYear, 2021, 1990, 2026),
    ownershipSharePercent: num(rawRE.ownershipSharePercent, maritalStatus === 'married' ? 50 : 100, 5, 100),
    annualAppreciationRate: num(rawRE.annualAppreciationRate, 3.2, 0, 10),
    planToSellHome: Boolean(rawRE.planToSellHome),
    sellHomeAge: num(rawRE.sellHomeAge, 72, currentAge + 1, 95),
    sellingCostPercent: num(rawRE.sellingCostPercent, 4.5, 1, 10)
  };

  const rawAR = raw.accountReturns || {};
  persona.accountReturns = {
    useCustomReturns: Boolean(rawAR.useCustomReturns),
    rrspReturn: num(rawAR.rrspReturn, 6.5, 0, 15),
    tfsaReturn: num(rawAR.tfsaReturn, 7.0, 0, 15),
    fhsaReturn: num(rawAR.fhsaReturn, 6.0, 0, 15),
    nonRegReturn: num(rawAR.nonRegReturn, 5.5, 0, 15),
    rrspPostReturn: num(rawAR.rrspPostReturn, 5.0, 0, 15),
    tfsaPostReturn: num(rawAR.tfsaPostReturn, 5.5, 0, 15),
    nonRegPostReturn: num(rawAR.nonRegPostReturn, 4.5, 0, 15)
  };

  if (raw.careerDisruption?.enabled) {
    persona.careerDisruption = {
      enabled: true,
      shockAge: num(raw.careerDisruption.shockAge, currentAge + 5, currentAge, retirementAge),
      reductionPercent: num(raw.careerDisruption.reductionPercent, 25, 5, 80),
      isTemporary: Boolean(raw.careerDisruption.isTemporary),
      recoveryYears: num(raw.careerDisruption.recoveryYears, 2, 1, 10),
    };
  }

  if (maritalStatus === 'married') {
    const rawSpouse: any = raw.spouse || {};
    const fallbackSpouse: any = (fallback as any).spouse || {};
    const spouseAge = num(rawSpouse.currentAge, currentAge, 18, 75);
    const spouseRetire = num(rawSpouse.retirementAge, retirementAge, spouseAge + 1, 80);
    const spouseIncome = num(rawSpouse.annualIncome, Math.round(currentAnnualIncome * 0.8), 0, 2000000);

    persona.spouse = {
      name: typeof rawSpouse.name === 'string' && rawSpouse.name.trim() ? rawSpouse.name.trim() : 'Spouse',
      currentAge: spouseAge,
      retirementAge: spouseRetire,
      annualIncome: spouseIncome,
      incomeGrowthRate: num(rawSpouse.incomeGrowthRate, 2.0, -10, 15),
      rrspBalance: num(rawSpouse.rrspBalance, fallbackSpouse.rrspBalance || 50000, 0),
      rrspAnnualContribution: num(rawSpouse.rrspAnnualContribution, fallbackSpouse.rrspAnnualContribution || 6000, 0, 32490),
      tfsaBalance: num(rawSpouse.tfsaBalance, fallbackSpouse.tfsaBalance || 35000, 0),
      tfsaAnnualContribution: num(rawSpouse.tfsaAnnualContribution, fallbackSpouse.tfsaAnnualContribution || 5500, 0, 7000),
      fhsaBalance: num(rawSpouse.fhsaBalance, fallbackSpouse.fhsaBalance || 0, 0, 40000),
      fhsaAnnualContribution: num(rawSpouse.fhsaAnnualContribution, fallbackSpouse.fhsaAnnualContribution || 0, 0, 8000),
      fhsaIntent: rawSpouse.fhsaIntent === 'home_purchase' ? 'home_purchase' : 'rollover_to_rrsp',
      fhsaHomePurchaseAge: num(rawSpouse.fhsaHomePurchaseAge, spouseAge + 4, spouseAge, 71),
      nonRegBalance: num(rawSpouse.nonRegBalance, fallbackSpouse.nonRegBalance || 20000, 0),
      nonRegAnnualContribution: num(rawSpouse.nonRegAnnualContribution, fallbackSpouse.nonRegAnnualContribution || 2500, 0),
      cppStartAge: num(rawSpouse.cppStartAge, 65, 60, 70),
      cppEstimatedPercentOfMax: num(rawSpouse.cppEstimatedPercentOfMax, 64, 0, 100),
      cppCalculationMethod: rawSpouse.cppCalculationMethod === 'service_canada' ? 'service_canada' : 'percentage',
      cppServiceCanadaEstimateAt65: num(rawSpouse.cppServiceCanadaEstimateAt65, 917, 0, 3000),
      oasStartAge: num(rawSpouse.oasStartAge, 65, 65, 70),
      oasEligibleYearsInCanada: num(rawSpouse.oasEligibleYearsInCanada, 40, 0, 40),
      pensionIncomeSplitting: rawSpouse.pensionIncomeSplitting !== false
    };
  }

  return persona;
}

// Heuristic rule-based generator for offline or graceful fallback
function generateRuleBasedFallbackPersona(prompt: string) {
  const lower = prompt.toLowerCase();
  
  // Extract age if present
  const ageMatch = lower.match(/(?:age\s*|i am\s*|am\s*)(\d{2})/i) || lower.match(/(\d{2})\s*(?:years|yo|yr|year)/i);
  const currentAge = ageMatch ? Math.min(65, Math.max(20, parseInt(ageMatch[1]))) : 35;

  // Extract retirement target age
  const retMatch = lower.match(/retir(?:e|ing|ement)\s*(?:at|by|age)?\s*(\d{2})/i);
  const retirementAge = retMatch ? Math.min(75, Math.max(currentAge + 2, parseInt(retMatch[1]))) : (currentAge < 50 ? 60 : 65);

  // Extract income
  const incomeMatch = lower.match(/(?:\$|salary\s*of\s*|earning\s*|making\s*)(\d{2,3})[,\s]?(\d{3})?/i) || lower.match(/(\d{2,3})k/i);
  let income = 85000;
  if (incomeMatch) {
    if (incomeMatch[0].includes('k')) {
      income = parseInt(incomeMatch[1]) * 1000;
    } else if (incomeMatch[2]) {
      income = parseInt(incomeMatch[1] + incomeMatch[2]);
    } else {
      income = parseInt(incomeMatch[1]) * 1000;
    }
  }

  // Detect province
  let province = 'ON';
  if (lower.includes('vancouver') || lower.includes('bc') || lower.includes('british columbia')) province = 'BC';
  else if (lower.includes('calgary') || lower.includes('edmonton') || lower.includes('alberta') || lower.includes('ab')) province = 'AB';
  else if (lower.includes('montreal') || lower.includes('quebec') || lower.includes('qc')) province = 'QC';
  else if (lower.includes('halifax') || lower.includes('nova scotia') || lower.includes('ns')) province = 'NS';

  const isMarried = lower.includes('married') || lower.includes('couple') || lower.includes('spouse') || lower.includes('partner');

  return {
    maritalStatus: isMarried ? 'married' : 'single',
    currentAge,
    retirementAge,
    lifeExpectancy: 88,
    province,
    currentAnnualIncome: income,
    incomeGrowthRate: 2.2,
    targetRetirementSpendingToday: Math.round(income * 0.65),
    rrspBalance: Math.round(income * 0.8),
    tfsaBalance: 35000,
    fhsaBalance: 12000,
    nonRegBalance: 20000,
    rrspAnnualContribution: Math.round(income * 0.12),
    tfsaAnnualContribution: 7000,
    fhsaAnnualContribution: 6000,
    nonRegAnnualContribution: 3000,
    fhsaOpenYear: 2023,
    fhsaIntent: 'rollover_to_rrsp',
    fhsaHomePurchaseAge: 40,
    cppStartAge: 65,
    cppEstimatedPercentOfMax: 75,
    oasStartAge: 65,
    oasEligibleYearsInCanada: 40,
    preRetirementReturn: 6.5,
    postRetirementReturn: 5.0,
    inflationRate: 2.1,
    nonRegYieldTaxRate: 1.2,
    drawdownStrategy: 'tax_efficient',
    realEstate: {
      ownsHome: true,
      costOfHome: 650000,
      currentMarketValue: 750000,
      downPayment: 130000,
      mortgageInterestRate: 4.79,
      mortgageTermYears: 25,
      mortgageStartYear: 2021,
      ownershipSharePercent: isMarried ? 50 : 100,
      annualAppreciationRate: 3.2,
      planToSellHome: false,
      sellHomeAge: 72,
      sellingCostPercent: 4.5
    },
    accountReturns: {
      useCustomReturns: false,
      rrspReturn: 6.5,
      tfsaReturn: 7.0,
      fhsaReturn: 6.0,
      nonRegReturn: 5.5,
      rrspPostReturn: 5.0,
      tfsaPostReturn: 5.5,
      nonRegPostReturn: 4.5
    },
    ...(isMarried ? {
      spouse: {
        name: 'Spouse',
        currentAge: Math.max(20, currentAge - 2),
        retirementAge: retirementAge,
        annualIncome: Math.round(income * 0.85),
        incomeGrowthRate: 2.0,
        rrspBalance: Math.round(income * 0.6),
        rrspAnnualContribution: Math.round(income * 0.1),
        tfsaBalance: 30000,
        tfsaAnnualContribution: 7000,
        fhsaBalance: 8000,
        fhsaAnnualContribution: 6000,
        fhsaOpenYear: 2023,
        fhsaIntent: 'rollover_to_rrsp',
        fhsaHomePurchaseAge: 40,
        nonRegBalance: 15000,
        nonRegAnnualContribution: 2500,
        cppStartAge: 65,
        cppEstimatedPercentOfMax: 70,
        oasStartAge: 65,
        oasEligibleYearsInCanada: 40,
        pensionIncomeSplitting: true
      }
    } : {})
  };
}

// Heuristic rule-based explanation generator for ledger & milestone schedule
function generateRuleBasedLedgerExplanation(
  question: string,
  selectedAge?: number,
  selectedMetric?: string,
  rowData?: any,
  planContext?: any
) {
  const q = question.toLowerCase();
  const age = selectedAge || rowData?.age || planContext?.retirementAge || 65;
  const isRetired = rowData?.isRetired ?? (age >= (planContext?.retirementAge || 65));
  const province = planContext?.province || 'ON';
  const fmt = (v?: number) => (v !== undefined ? `$${Math.round(v).toLocaleString()}` : '$0');

  // Estate Planning, Funeral Costs & Succession
  if (q.includes('funeral') || q.includes('death benefit') || q.includes('estate') || q.includes('escheat') || q.includes('spousal rollover') || q.includes('deemed disposition') || selectedMetric === 'Estate Planning') {
    const grossEstate = rowData?.totalNetWorth || 0;
    const rrsp = rowData?.rrspBalance || 0;
    const tfsa = rowData?.tfsaBalance || 0;
    const nonReg = rowData?.nonRegBalance || 0;
    const homeEq = rowData?.homeEquity || 0;

    return {
      summary: `Under Canadian succession law, at Age ${age}, the deceased estate ($${Math.round(grossEstate).toLocaleString()}) must first settle priority debts—including funeral and burial costs—and CRA terminal T1 taxes before any beneficiary or charitable inheritances are paid.`,
      formula: `Net Liquidated Estate = Gross Reserves (RRSP + TFSA + Non-Reg + Home Equity) - Terminal CRA Taxes (T1 deemed disposition) - Provincial Probate Fees - Net Funeral Burden (Gross Funeral - $2,500 CPP Death Benefit) - Executor/Closing Admin.`,
      mathBreakdown: [
        `1. Priority First-Charge Debt: Funeral, memorial, and burial/cremation costs are legally paid directly from estate funds before heirs receive any bequests.`,
        `2. Canada Pension Plan (CPP) Death Benefit: The estate or executor can claim the statutory one-time lump-sum benefit of up to $2,500 from Service Canada to offset funeral bills.`,
        `3. CRA Deemed Disposition: Registered accounts (RRSP/RRIF: $${Math.round(rrsp).toLocaleString()}) are taxed as 100% ordinary terminal income unless transferred to a surviving spouse via CRA s. 70(6) rollover.`,
        `4. Probate Protection: TFSA ($${Math.round(tfsa).toLocaleString()}) and named beneficiary RRSPs bypass probate court, while non-reg accounts ($${Math.round(nonReg).toLocaleString()}) and real estate ($${Math.round(homeEq).toLocaleString()}) pay provincial estate administration taxes.`
      ],
      contextualGuidance: `Funeral homes in Canada can directly bill the deceased's bank account with proof of death and the funeral invoice, prior to probate approval. Utilizing the $2,500 CPP Death Benefit reduces this first-charge burden, protecting remaining capital for your beneficiaries.`,
      suggestedFollowUps: [
        `How can direct beneficiary designations help my family avoid provincial probate?`,
        `How does a CRA Section 70(6) spousal rollover defer RRSP terminal tax?`,
        `How can charitable donations offset up to 100% of terminal income tax on death?`
      ]
    };
  }

  // 1. Crossover Point (Returns Outgrow Living Expenses)
  if (q.includes('crossover') || q.includes('outgrow') || q.includes('surpass') || selectedMetric === 'Investment Returns' || selectedMetric === 'Crossover') {
    const returns = rowData?.totalInvestmentGrowth ?? 0;
    const living = rowData?.targetSpendingNominal ?? 0;
    const surplus = returns - living;
    return {
      summary: `At Age ${age}, your annual portfolio investment return (${fmt(returns)}/yr) ${surplus >= 0 ? `outgrows and surpasses your required annual living expenses (${fmt(living)}/yr) with a passive growth surplus of ${fmt(surplus)}/yr` : `generates ${fmt(returns)}/yr toward your ${fmt(living)}/yr annual living budget`}.`,
      formula: `Crossover Velocity = Total Investment Growth (RRSP + TFSA + FHSA + Non-Reg returns) - Annual Living Expenses (inflation-adjusted budget). Reached when Annual Returns ≥ Annual Living Expenses.`,
      mathBreakdown: [
        `1. Annual Investment Returns: ${fmt(returns)}/yr (compounded across all active accounts).`,
        `2. Required Living Expenses: ${fmt(living)}/yr (adjusted for Canadian CPI inflation).`,
        `3. Passive Compounding Velocity: ${surplus >= 0 ? `+${fmt(surplus)}/yr net surplus (portfolio generates more than you spend!)` : `${fmt(surplus)}/yr toward living expenses`}.`,
        `4. Milestone Significance: The household no longer relies on active salary to expand wealth; passive capital generates more wealth than lifestyle consumes.`
      ],
      contextualGuidance: `Reaching the Crossover Point is one of the ultimate milestones in financial independence (FIRE). Even before you formally retire, crossing this velocity point means your invested capital outearns your living costs, granting unprecedented psychological security.`,
      suggestedFollowUps: [
        `Can I transition to part-time or sabbatical once reaching the crossover point?`,
        `How does a 10% market crash impact the crossover milestone?`,
        `How does Crossover differ from full retirement readiness?`
      ]
    };
  }

  // 2. Coast FIRE / Zero-Contribution Viability Milestone
  if (q.includes('coast') || q.includes('zero-contribution') || q.includes('stop contributing') || q.includes('stops contributing') || selectedMetric === 'Coast FIRE') {
    const nw = rowData?.totalNetWorth ?? 0;
    return {
      summary: `Coast FIRE marks the zero-contribution viability milestone: the point where your accumulated assets (${fmt(nw)}) have grown large enough that, even if you contribute $0 more for the rest of your career, compound growth alone will 100% fund your intended retirement living expenses through age ${planContext?.lifeExpectancy || 85}.`,
      formula: `Coast FIRE Viability = Current Invested Assets × (1 + Net Expected Return)^(Years to Retirement) ≥ Capital Required at Retirement to sustain all post-retirement living expenses through Life Expectancy without asset depletion.`,
      mathBreakdown: [
        `1. Accumulated Invested Assets: ${fmt(nw)}.`,
        `2. Future Contributions Required: $0/year (you can safely stop saving into RRSP, TFSA, FHSA, and non-reg accounts).`,
        `3. Decumulation Testing: Simulation engine confirms that $0 future savings from Age ${age} still reaches retirement and never depletes before Age ${planContext?.lifeExpectancy || 85}.`,
        `4. Lifestyle Freedom: You only need to earn enough to cover current living expenses ("coasting"), giving you the power to downshift, change careers, or eliminate savings pressure.`
      ],
      contextualGuidance: `Achieving Coast FIRE early decouples your work from the pressure to save. Rather than aggressively pushing savings rates into late career, many Canadians use Coast FIRE to take sabbaticals, start passion businesses, or spend more disposable income on family today.`,
      suggestedFollowUps: [
        `What happens to my retirement date if I continue contributing anyway?`,
        `How does a prolonged bear market affect my Coast FIRE safety buffer?`,
        `Which accounts should I leave untouched to coast safely?`
      ]
    };
  }

  // 3. Tax Paid
  if (q.includes('tax') || selectedMetric === 'Tax Paid') {
    const taxPaid = rowData?.totalTaxPaid ?? 0;
    const taxableIncome = rowData?.taxableIncome ?? (rowData?.cppIncome || 0) + (rowData?.oasGrossIncome || 0) + (rowData?.rrspWithdrawal || 0);
    return {
      summary: `At Age ${age}, your combined federal and provincial (${province}) tax liability is ${fmt(taxPaid)} based on taxable income of ${fmt(taxableIncome)}.`,
      formula: `Total Tax Paid = Federal Tax (progressive brackets 15% to 33%) + Provincial Tax (${province} brackets) - Non-Refundable Tax Credits (Basic Personal, Age Amount, Pension Income Credit) + OAS Recovery Clawback (if net world income exceeds CRA threshold).`,
      mathBreakdown: [
        `1. Taxable Income: ${fmt(taxableIncome)} (composed of employment wages or registered RRIF withdrawals plus CPP and OAS pensions).`,
        `2. TFSA withdrawals (${fmt(rowData?.tfsaWithdrawal)}) and non-registered return of capital are 100% tax-free and excluded from taxable income.`,
        `3. Federal progressive tax brackets applied with CRA Basic Personal Amount credit.`,
        `4. ${province} provincial brackets applied to determine total net tax: ${fmt(taxPaid)}.`
      ],
      contextualGuidance: `During retirement, your effective average tax rate is significantly lower than working years. Utilizing TFSA withdrawals alongside taxable RRIF/CPP income prevents pushing you into higher provincial brackets and shields you from OAS clawbacks.`,
      suggestedFollowUps: [
        `How is OAS clawback calculated at this age?`,
        `What is the difference in tax if I use TFSA-First drawdown?`,
        `How does CRA Pension Income Splitting reduce our couple tax bill?`
      ]
    };
  }

  // 2. CPP Pension
  if (q.includes('cpp') || selectedMetric === 'CPP') {
    const cppIncome = rowData?.cppIncome ?? 0;
    const cppStartAge = planContext?.cppStartAge ?? 65;
    const isEarly = cppStartAge < 65;
    const isLate = cppStartAge > 65;
    const adjPct = isEarly ? -((65 - cppStartAge) * 7.2).toFixed(1) : isLate ? +((cppStartAge - 65) * 8.4).toFixed(1) : '0';
    const isServiceCanada = planContext?.cppCalculationMethod === 'service_canada';
    const socBase = planContext?.cppServiceCanadaEstimateAt65 || 800;

    const formula = isServiceCanada
      ? `Annual CPP = Service Canada SOC Estimate ($${socBase}/mo @ 65) × [1 + Early Retirement & Career Shock Dilution] × [1 + Actuarial Adjustment (${adjPct}%)] × Cumulative CPI Inflation Factor.`
      : `Annual CPP = Maximum Base Pension (~$17,202 in 2026) × Contribution History Factor (${planContext?.cppEstimatedPercentOfMax || 75}%) × [1 + Actuarial Adjustment (${adjPct}%)] × Cumulative CPI Inflation Factor.`;

    const mathBreakdown = isServiceCanada
      ? [
          `1. Service Canada Statement of Contributions baseline: $${socBase}/mo ($${socBase * 12}/yr at age 65).`,
          `2. Early retirement & career shock adjustment: Service Canada assumes constant contributions to 65. Retiring early (age ${planContext?.retirementAge || 65}) dilutes the 39-year divisor after the 17% drop-out buffer.`,
          `3. Collection timing adjustment: Starting at Age ${cppStartAge} applies a ${adjPct}% permanent ${isEarly ? 'reduction (-0.6%/mo)' : isLate ? 'enhancement (+0.7%/mo)' : 'baseline'}.`,
          `4. Indexed with cumulative CPI inflation up to Age ${age} yields: ${fmt(cppIncome)}/yr.`
        ]
      : [
          `1. Standard age 65 full statutory maximum: ~$17,202/yr ($1,433.50/mo in 2026).`,
          `2. Lifetime career contribution factor: ${planContext?.cppEstimatedPercentOfMax || 75}%.`,
          `3. Timing adjustment: Starting at Age ${cppStartAge} results in a ${adjPct}% permanent ${isEarly ? 'reduction (-0.6%/mo)' : isLate ? 'enhancement (+0.7%/mo)' : 'baseline'}.`,
          `4. Indexed with cumulative CPI inflation up to Age ${age} yields: ${fmt(cppIncome)}/yr.`
        ];

    return {
      summary: `At Age ${age}, Canada Pension Plan (CPP) generates ${fmt(cppIncome)}/year in inflation-indexed retirement income.`,
      formula,
      mathBreakdown,
      contextualGuidance: isServiceCanada
        ? `Service Canada's online statement assumes you continue earning your current salary every year until 65. If you retire early or experience a career downturn, our model recalibrates your benefit downwards to reflect missing contribution years.`
        : `CPP provides guaranteed, government-backed, lifetime longevity insurance that adjusts annually with Statistics Canada CPI inflation. Delaying CPP past age 65 provides a risk-free 8.4%/year real return enhancement.`,
      suggestedFollowUps: [
        `What happens to my portfolio longevity if I delay CPP to Age 70?`,
        `How does early retirement dilute my Service Canada CPP estimate?`,
        `Can CPP be shared or split with a spouse under CRA rules?`
      ]
    };
  }

  // 3. OAS & Clawback
  if (q.includes('oas') || q.includes('clawback') || selectedMetric === 'OAS (Net)') {
    const oasGross = rowData?.oasGrossIncome ?? 0;
    const oasClawback = rowData?.oasClawback ?? 0;
    const oasNet = rowData?.oasNetIncome ?? (oasGross - oasClawback);
    return {
      summary: `At Age ${age}, your gross Old Age Security (OAS) is ${fmt(oasGross)}, with ${oasClawback > 0 ? `${fmt(oasClawback)} clawback` : '$0 clawback'}, giving net OAS of ${fmt(oasNet)}.`,
      formula: `Net OAS = Gross OAS ($8,560 base indexed) - OAS Recovery Tax [15% × (Net World Income - CRA Threshold of ~$93,208 indexed)].`,
      mathBreakdown: [
        `1. Gross OAS entitlement: ${fmt(oasGross)}/yr (starts at Age 65; 10% boost at Age 75).`,
        `2. CRA Clawback Threshold: ~$93,208 (indexed with inflation).`,
        `3. Your net income relative to threshold results in recovery tax of: ${fmt(oasClawback)}.`,
        `4. Final net pension paid by Service Canada: ${fmt(oasNet)}.`
      ],
      contextualGuidance: `To prevent OAS clawback, manage taxable income by blending RRIF withdrawals with tax-free TFSA funds or utilizing capital gains and non-registered return of capital.`,
      suggestedFollowUps: [
        `At what net income does OAS become completely clawed back?`,
        `Does TFSA income trigger the OAS recovery tax?`,
        `How does pension income splitting protect higher earners from clawback?`
      ]
    };
  }

  // 4. RRSP / RRIF & Mandatory Minimums
  if (q.includes('rrsp') || q.includes('rrif') || selectedMetric === 'RRSP / RRIF') {
    const rrspBal = rowData?.rrspBalance ?? 0;
    const rrspWithdrawal = rowData?.rrspWithdrawal ?? 0;
    const isPast71 = age >= 71;
    return {
      summary: `At Age ${age}, your RRSP/RRIF account holds ${fmt(rrspBal)} with ${fmt(rrspWithdrawal)} in withdrawals for the year.`,
      formula: isPast71
        ? `Mandatory RRIF Minimum = RRIF Balance (Dec 31) × CRA Prescribed Minimum Factor [e.g. 1 / (90 - Age), or 5.40% at age 72, climbing each year].`
        : `RRSP Balance = (Prior Balance + Contributions) × (1 + Investment Return) - Strategic Drawdowns.`,
      mathBreakdown: [
        `1. Account status: ${isPast71 ? 'Converted to RRIF (mandatory by Dec 31 of age 71)' : isRetired ? 'Decumulation phase (taxable withdrawals)' : 'Accumulation phase (tax-deductible savings)'}.`,
        `2. Annual withdrawal: ${fmt(rrspWithdrawal)} (100% taxable as ordinary Canadian income).`,
        `3. Remaining balance compounding at expected return rate: ${fmt(rrspBal)}.`
      ],
      contextualGuidance: `Because RRIF withdrawals are fully taxable, large balances past age 71 can force heavy mandatory withdrawals that spike your tax bracket and trigger OAS clawbacks. An early 'RRSP meltdown' drawdown between ages 60–71 often yields superior tax savings.`,
      suggestedFollowUps: [
        `What is the CRA mandatory minimum withdrawal percentage at my age?`,
        `How does an RRSP Meltdown strategy work?`,
        `What happens to remaining RRSP/RRIF assets upon death in Canada?`
      ]
    };
  }

  // 5. Total Net Worth
  if (q.includes('net worth') || selectedMetric === 'Total Net Worth') {
    const nw = rowData?.totalNetWorth ?? 0;
    const rrsp = rowData?.rrspBalance ?? 0;
    const tfsa = rowData?.tfsaBalance ?? 0;
    const fhsa = rowData?.fhsaBalance ?? 0;
    const nonReg = rowData?.nonRegBalance ?? 0;
    const homeEq = rowData?.homeEquity ?? 0;
    return {
      summary: `At Age ${age}, your Total Household Net Worth stands at ${fmt(nw)}.`,
      formula: `Total Net Worth = Liquid Financial Assets (RRSP/RRIF + TFSA + FHSA + Non-Registered) + Real Estate Net Home Equity (Property Market Value - Remaining Mortgage).`,
      mathBreakdown: [
        `1. RRSP / RRIF: ${fmt(rrsp)}`,
        `2. TFSA (100% Tax-Free): ${fmt(tfsa)}`,
        `3. FHSA: ${fmt(fhsa)}`,
        `4. Non-Registered Savings & Investments: ${fmt(nonReg)}`,
        `5. Real Estate Home Equity: ${fmt(homeEq)}`,
        `6. Sum of Total Assets: ${fmt(nw)}`
      ],
      contextualGuidance: `Net worth represents your total financial security buffer. Notice that while RRSP dollars are pre-tax, TFSA dollars and primary residence home equity (under the Canadian Principal Residence Exemption) are 100% after-tax wealth.`,
      suggestedFollowUps: [
        `What is my peak net worth age and amount?`,
        `How much of my net worth is liquid vs tied in home equity?`,
        `What drawdown strategy keeps my net worth funded the longest?`
      ]
    };
  }

  // 6. Withdrawals & Cash Flow
  if (q.includes('withdrawal') || q.includes('spendable') || selectedMetric === 'Withdrawals' || selectedMetric === 'Spendable Cash') {
    const withdrawals = (rowData?.rrspWithdrawal || 0) + (rowData?.tfsaWithdrawal || 0) + (rowData?.nonRegWithdrawal || 0);
    const spendable = rowData?.afterTaxIncome ?? 0;
    return {
      summary: `At Age ${age}, your plan executes ${fmt(withdrawals)} in portfolio withdrawals to fund ${fmt(spendable)} in net spendable living cash.`,
      formula: `Net Spendable Cash = (Employment Income + CPP + OAS Net + Portfolio Withdrawals) - Total Income Tax Paid - Debt Payments.`,
      mathBreakdown: [
        `1. Required Living Budget: ~${fmt(spendable)} in inflation-adjusted dollars.`,
        `2. Covered by Government Pensions (CPP + Net OAS): ${fmt((rowData?.cppIncome || 0) + (rowData?.oasNetIncome || 0))}.`,
        `3. Remaining Gap Covered by Portfolio Withdrawals: ${fmt(withdrawals)}.`,
        `4. Sequenced across accounts according to your selected drawdown strategy (${planContext?.drawdownStrategy || 'Tax Efficient'}).`
      ],
      contextualGuidance: `A disciplined drawdown hierarchy ensures your accounts deplete in the most tax-advantaged order, maximizing compound growth inside tax-sheltered vehicles for as long as possible.`,
      suggestedFollowUps: [
        `How does Proportional vs Tax-Efficient drawdown compare?`,
        `Can my portfolio sustain an extra $500/month of spending?`,
        `How is inflation impacting my living expenses at this age?`
      ]
    };
  }

  // Debt Payments & Amortization
  if (q.includes('debt') || q.includes('loan') || selectedMetric === 'Debt Payments') {
    const debtPayment = rowData?.debtPayment ?? 0;
    const debtPrincipal = rowData?.debtPrincipalPaid ?? 0;
    const debtInterest = rowData?.debtInterestPaid ?? 0;
    const remainingDebt = rowData?.remainingDebt ?? 0;
    return {
      summary: `At Age ${age}, your annual debt service outflow is ${fmt(debtPayment)}, leaving a remaining debt balance of ${fmt(remainingDebt)}.`,
      formula: `Debt Payment = Principal Repayment (${fmt(debtPrincipal)}) + Interest Paid (${fmt(debtInterest)}). Net Spendable Cash is reduced dollar-for-dollar by this service.`,
      mathBreakdown: [
        `1. Total Annual Debt Service: ${fmt(debtPayment)}/yr (${fmt(Math.round(debtPayment / 12))}/mo).`,
        `2. Principal Amortization: ${fmt(debtPrincipal)} (builds equity by reducing liabilities).`,
        `3. Interest Drag: ${fmt(debtInterest)} in financing carrying costs paid to lenders.`,
        `4. Remaining Portfolio Liability: ${fmt(remainingDebt)} (subtracted directly from Total Net Worth).`
      ],
      contextualGuidance: `Paying down debt accelerates your retirement date in two distinct ways: first, it eliminates ongoing monthly financing drag, immediately expanding your spendable cash; second, redirecting those freed payments into compounding TFSA or RRSP investments creates an exponential boost to your final retirement nest egg.`,
      suggestedFollowUps: [
        `How much sooner can I retire if I pay off debt early?`,
        `Should I prioritize paying off debt or investing in TFSA/RRSP?`,
        `How does the Canadian Debt Avalanche compare to the Snowball method?`
      ]
    };
  }

  // Default General Ledger Explanation
  return {
    summary: `At Age ${age}, this milestone row captures your comprehensive Canadian balance sheet, annual cash flows, government pensions, and tax obligations.`,
    formula: `Annual Net Cash Flow = Total Gross Inflows (Employment/Pensions/Withdrawals) - Canadian Federal & Provincial Taxes - Debt Service - Living Costs.`,
    mathBreakdown: [
      `1. Total Net Worth: ${fmt(rowData?.totalNetWorth)}`,
      `2. Annual Withdrawals: ${fmt((rowData?.rrspWithdrawal || 0) + (rowData?.tfsaWithdrawal || 0) + (rowData?.nonRegWithdrawal || 0))}`,
      `3. Government Incomes: CPP ${fmt(rowData?.cppIncome)} + OAS ${fmt(rowData?.oasNetIncome)}`,
      `4. Total Tax Paid: ${fmt(rowData?.totalTaxPaid)} (Province: ${province})`
    ],
    contextualGuidance: `Every line in this milestone ledger is dynamically integrated. Changes to your retirement age, savings contributions, or market returns ripple through the tax brackets and compounding formulas across all future years.`,
    suggestedFollowUps: [
      `How is Total Tax calculated at Age ${age}?`,
      `How is CPP determined for this year?`,
      `Why does my Net Worth trend the way it does after retirement?`
    ]
  };
}

// Actuarial rule-based generator for What-If scenario narrative insights
function generateRuleBasedWhatIfNarrative(
  scenarioName?: string,
  settings?: any,
  metrics?: any,
  planContext?: any,
  customQuestion?: string
) {
  const returnDelta = Number(settings?.returnDelta ?? 0);
  const apprDelta = Number(settings?.appreciationDelta ?? 0);
  const inflDelta = Number(settings?.inflationDelta ?? 0);
  const isFullyFunded = Boolean(planContext?.isFullyFunded);
  const depletionAge = planContext?.depletionAge;
  const clientName = planContext?.userName || 'You';
  const retireAge = planContext?.retirementAge || 65;

  let riskRating: 'low' | 'moderate' | 'high' | 'critical' = 'moderate';
  let riskLabel = 'Moderate sensitivity to macro fluctuations';

  if (!isFullyFunded || (returnDelta <= -2 && inflDelta >= 1.5)) {
    riskRating = 'critical';
    riskLabel = 'Critical Longevity Shock: Portfolio faces early depletion without spending or savings remediation';
  } else if (returnDelta < 0 || inflDelta > 1) {
    riskRating = 'high';
    riskLabel = 'High Vulnerability: Inflation or depressed returns noticeably compress your post-retirement cashflow';
  } else if (returnDelta >= 1 && inflDelta <= 0) {
    riskRating = 'low';
    riskLabel = 'Resilient Growth: Accelerated compounding strengthens nest egg and milestone buffers';
  } else if (returnDelta === 0 && apprDelta === 0 && inflDelta === 0) {
    riskRating = isFullyFunded ? 'low' : 'moderate';
    riskLabel = isFullyFunded ? 'Plan is 100% funded under baseline Canadian assumptions' : 'Baseline plan exhibits asset depletion';
  }

  const title = scenarioName || (
    returnDelta === 0 && apprDelta === 0 && inflDelta === 0
      ? 'Current Baseline Strategy'
      : `What-If Stress Scenario (${returnDelta >= 0 ? '+' : ''}${returnDelta}% Return, ${apprDelta >= 0 ? '+' : ''}${apprDelta}% Home, ${inflDelta >= 0 ? '+' : ''}${inflDelta}% Inflation)`
  );

  let summary = '';
  if (returnDelta <= -1.5 && inflDelta >= 1.5) {
    summary = `${clientName}'s plan is undergoing a severe Stagflation Shock. A +${inflDelta.toFixed(1)}% inflation surge compounds living costs dollar-for-dollar, while a ${returnDelta.toFixed(1)}% drop in portfolio yields reduces passive compounding, squeezing the decumulation safety margin ${isFullyFunded ? 'substantially' : (depletionAge ? `and accelerating portfolio depletion to Age ${depletionAge}` : 'and shortening portfolio longevity')}.`;
  } else if (inflDelta >= 1.5) {
    summary = `This test models Sticky Inflation Drag (+${inflDelta.toFixed(1)}% CPI). While nominal portfolio returns remain intact, purchasing power erodes, requiring higher registered withdrawals and elevating exposure to upper Canadian tax brackets.`;
  } else if (returnDelta <= -1.5) {
    summary = `This scenario isolates a Bear Market Compression (${returnDelta.toFixed(1)}% annual return haircut). Capital accumulation slows during the pre-retirement phase, delaying key financial independence milestones.`;
  } else if (returnDelta >= 1.5) {
    summary = `Under this Bull Compounding scenario (+${returnDelta.toFixed(1)}% return), compound interest dramatically outpaces lifestyle inflation. The nest egg at Age ${retireAge} expands by ${metrics?.retirementNetWorth?.percentDelta ? `${metrics.retirementNetWorth.percentDelta.toFixed(0)}%` : 'a significant margin'}, generating substantial excess legacy.`;
  } else {
    summary = `Under this test scenario (${returnDelta >= 0 ? '+' : ''}${returnDelta.toFixed(1)}% return, ${inflDelta >= 0 ? '+' : ''}${inflDelta.toFixed(1)}% inflation), ${clientName}'s retirement cash flow adjusts to $${Math.round(metrics?.retirementCashflow?.whatIfNominalMonthly || 0).toLocaleString()}/month (real purchasing power: $${Math.round(metrics?.retirementCashflow?.whatIfRealMonthly || 0).toLocaleString()}/month).`;
  }

  const safeAssets = [
    'Tax-Free Savings Account (TFSA): 100% shielded from inflation bracket creep and Canadian clawbacks.',
    'Canada Pension Plan (CPP) & Old Age Security (OAS): Statistically inflation-protected via statutory quarterly and annual CPI indexation.'
  ];
  if (planContext?.hasHome) {
    safeAssets.push('Primary Residence Equity: 100% exempt from capital gains tax in Canada under the Principal Residence Exemption (PRE).');
  }

  const vulnerableAssets = [
    'Registered Retirement Savings (RRSP/RRIF): Subject to 100% income tax inclusion on withdrawal; higher inflation increases required withdrawals, forcing higher provincial tax brackets.',
    'Non-Registered Investments: Annual yield drag from taxable Canadian dividends and realized capital gains diminishes compound recovery.'
  ];
  if (!isFullyFunded) {
    vulnerableAssets.push(`Late-Stage Longevity Buffer: Portfolio runs out of liquid capital prior to life expectancy (Age ${planContext?.lifeExpectancy || 85}).`);
  }

  const crossAge = metrics?.crossoverImpact?.whatIfAge;
  const crossBase = metrics?.crossoverImpact?.baselineAge;
  const coastAge = metrics?.coastFireImpact?.whatIfAge;
  const coastBase = metrics?.coastFireImpact?.baselineAge;

  let milestoneImpactSummary = '';
  if (crossAge && crossBase && crossAge !== crossBase) {
    milestoneImpactSummary += `Crossover Point (where passive returns exceed living costs) shifts from Age ${crossBase} to Age ${crossAge} (${crossAge > crossBase ? `delayed by ${crossAge - crossBase} years` : `accelerated by ${crossBase - crossAge} years`}). `;
  } else if (crossAge) {
    milestoneImpactSummary += `Crossover Point remains steady at Age ${crossAge}. `;
  } else {
    milestoneImpactSummary += `Crossover Point is not achieved prior to retirement under these lower return assumptions. `;
  }

  if (coastAge && coastBase && coastAge !== coastBase) {
    milestoneImpactSummary += `Coast FIRE (zero-contribution viability) moves from Age ${coastBase} to Age ${coastAge}.`;
  } else if (coastAge) {
    milestoneImpactSummary += `Coast FIRE viability remains intact at Age ${coastAge}.`;
  } else {
    milestoneImpactSummary += `Zero-contribution viability is postponed until closer to target retirement age.`;
  }

  const remediationTactics = [
    'Prioritize TFSA Over Non-Registered Accounts: In higher inflation or lower return climates, directing savings into TFSA eliminates annual dividend taxation and keeps withdrawals 100% invisible to OAS clawback thresholds.',
    'Delay CPP/OAS to Age 70 as Inflation Hedge: Each year of deferral past age 65 boosts CPP by +8.4% and OAS by +7.2% permanently. Because these pensions are statutory CPI-indexed by the Government of Canada, they form the ultimate inflation hedge.',
    'Execute Tactical Early RRSP Meltdown: Draw down taxable RRSP balances between ages 60 and 71 to absorb lower marginal brackets before mandatory RRIF minimums and pension income force you into higher tax brackets.'
  ];

  const projectionLimits = 'This sensitivity projection models the chosen macro adjustments as uniform annual shifts. In real-world market cycles, returns fluctuate with mean-reversion, central bank policy intervenes to suppress inflation, and Canadian retirees dynamically adapt their discretionary spending and asset allocations.';

  let customAnswer: string | undefined = undefined;
  if (customQuestion) {
    const q = customQuestion.toLowerCase();
    if (q.includes('tfsa')) {
      customAnswer = `Your TFSA is your strongest defensive weapon in this scenario. Because TFSA withdrawals are neither taxable nor counted as net income for OAS/GIS clawback tests, drawing from your TFSA during high-inflation or down-market years protects your tax bracket.`;
    } else if (q.includes('cpp') || q.includes('oas') || q.includes('delay') || q.includes('70')) {
      customAnswer = `Delaying CPP to Age 70 provides a guaranteed +42% permanent enhancement, and OAS +36%. Both are indexed to Statistics Canada CPI every quarter, making deferral the safest government-backed inflation defense in this scenario.`;
    } else if (q.includes('house') || q.includes('home') || q.includes('downsize')) {
      customAnswer = `Under Canadian law, all gains on your primary residence are 100% tax-free under the Principal Residence Exemption. In adverse market scenarios, downsizing or tapping equity can inject immediate liquid capital into your TFSA or non-registered reserves.`;
    } else {
      customAnswer = `Under this tested scenario, maintaining a cash buffer of 1-2 years of living expenses prevents selling equities at depressed valuations (sequence-of-returns protection), while maximizing tax-free TFSA growth shields your core wealth.`;
    }
  }

  return {
    scenarioTitle: title,
    riskRating,
    riskLabel,
    summary,
    assetSafetyAnalysis: {
      safeAssets,
      vulnerableAssets,
      sequenceRiskLevel: riskRating === 'critical' || riskRating === 'high' ? 'Elevated sequence-of-returns sensitivity' : 'Manageable market sequence risk'
    },
    milestoneImpactSummary,
    remediationTactics,
    projectionLimits,
    customAnswer
  };
}

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MapleRetire server running on port ${PORT}`);
  });
}

startServer();
