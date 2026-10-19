import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// API: Generate Canadian Retirement Persona from natural language prompt
app.post('/api/generate-persona', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'A descriptive persona prompt is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback parser if API key is not present in local dev
      const fallbackPersona = generateRuleBasedFallbackPersona(prompt);
      return res.json({ persona: fallbackPersona, source: 'heuristic' });
    }

    const ai = new GoogleGenAI({ apiKey });

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
    console.error('Error generating AI persona:', error);
    // Provide graceful heuristic fallback if Gemini call fails
    try {
      const fallbackPersona = generateRuleBasedFallbackPersona(req.body?.prompt || '');
      return res.json({ persona: fallbackPersona, source: 'heuristic_fallback', warning: error.message });
    } catch (fallbackError) {
      return res.status(500).json({ error: 'Failed to generate persona. Please try again.' });
    }
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
