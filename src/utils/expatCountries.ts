import { ExpatDestinationCountry, ExpatInputs } from '../types/expat';

export const EXPAT_DESTINATIONS: ExpatDestinationCountry[] = [
  {
    id: 'mexico',
    name: 'Mexico',
    flag: '🇲🇽',
    region: 'Americas',
    currencyCode: 'MXN',
    currencySymbol: '$',
    exchangeRateToCAD: 13.50, // 1 CAD ≈ 13.50 MXN
    costOfLivingIndex: 0.50, // 50% lower cost of living than Canada
    purchasingPowerMultiplier: 2.00, // 2x purchasing power
    hasTaxTreaty: true,
    treatyRates: {
      cppWithholding: 15,
      oasWithholding: 15,
      rrspPeriodicWithholding: 15, // Reduced from 25% to 15% under Art. 18 of Canada-Mexico Treaty
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 15
    },
    localIncomeTaxRate: 0, // Mexico generally does not tax Canadian government/pension payments already taxed at source under treaty
    localTaxTreatmentNotes: 'Canada-Mexico Treaty prevents double taxation. Canadian periodic pensions face 15% CRA withholding with Mexican foreign tax credits.',
    healthCareNotes: 'High-quality private healthcare in major expat hubs (Guadalajara, Mexico City, Puerto Vallarta) at 60-70% lower cost than North America.',
    visaProgram: 'Residente Temporal / Permanente (accessible solvency criteria, ~$3,500 CAD/mo passive income).',
    popularRetirementTowns: ['Lake Chapala / Ajijic', 'Puerto Vallarta', 'San Miguel de Allende', 'Mérida', 'Playa del Carmen'],
    climate: 'Year-round warmth, highland spring climates, and tropical coastlines.'
  },
  {
    id: 'portugal',
    name: 'Portugal',
    flag: '🇵🇹',
    region: 'Europe',
    currencyCode: 'EUR',
    currencySymbol: '€',
    exchangeRateToCAD: 0.68, // 1 CAD ≈ 0.68 EUR
    costOfLivingIndex: 0.65, // 35% lower cost of living
    purchasingPowerMultiplier: 1.54, // 1.54x purchasing power
    hasTaxTreaty: true,
    treatyRates: {
      cppWithholding: 15,
      oasWithholding: 15,
      rrspPeriodicWithholding: 15,
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 15
    },
    localIncomeTaxRate: 10, // Post-NHR / D7 standard rates or progressive with foreign tax credits
    localTaxTreatmentNotes: 'Canada-Portugal Tax Treaty caps Canadian withholding at 15%. Foreign tax credits offset Portuguese IRS liability.',
    healthCareNotes: 'Universal SNS public system available to legal residents, supplemented by affordable private insurance (€50-€120/month).',
    visaProgram: 'D7 Passive Income Visa (requires regular pension/investment income matching Portuguese minimum wage ~€820/mo + savings).',
    popularRetirementTowns: ['Algarve (Lagos, Tavira)', 'Cascais / Estoril', 'Silver Coast (Caldas)', 'Porto & Douro Valley', 'Madeira Island'],
    climate: 'Over 300 sunny days per year, mild Atlantic winters, temperate summers.'
  },
  {
    id: 'costa_rica',
    name: 'Costa Rica',
    flag: '🇨🇷',
    region: 'Americas',
    currencyCode: 'CRC',
    currencySymbol: '₡',
    exchangeRateToCAD: 375.0, // 1 CAD ≈ 375 CRC
    costOfLivingIndex: 0.60,
    purchasingPowerMultiplier: 1.67,
    hasTaxTreaty: false, // Statutory Part XIII 25% applies, BUT Costa Rica has strict territorial tax system
    treatyRates: {
      cppWithholding: 25,
      oasWithholding: 25,
      rrspPeriodicWithholding: 25,
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 25
    },
    localIncomeTaxRate: 0, // 100% Tax-Free locally on foreign source income under Costa Rican territorial tax system!
    localTaxTreatmentNotes: 'No bilateral tax treaty (CRA withholds standard 25% Part XIII). However, Costa Rica operates a territorial tax system—foreign pension income is 100% tax-free locally.',
    healthCareNotes: 'Caja Costarricense de Seguro Social (CCSS) public system for residents + excellent private hospitals (CIMA, Clinica Biblica).',
    visaProgram: 'Pensionado Visa (guaranteed lifetime pension of $1,000 USD/month qualifies applicant and spouse).',
    popularRetirementTowns: ['Central Valley (Atenas, Escazú)', 'Guanacaste Gold Coast (Tamarindo)', 'Lake Arenal', 'Manuel Antonio', 'Uvita'],
    climate: 'Pura Vida lifestyle, tropical rainforests, Pacific and Caribbean coasts.'
  },
  {
    id: 'thailand',
    name: 'Thailand',
    flag: '🇹🇭',
    region: 'Asia-Pacific',
    currencyCode: 'THB',
    currencySymbol: '฿',
    exchangeRateToCAD: 26.50, // 1 CAD ≈ 26.50 THB
    costOfLivingIndex: 0.40, // 60% lower cost of living than Canada!
    purchasingPowerMultiplier: 2.50, // 2.50x purchasing power
    hasTaxTreaty: true,
    treatyRates: {
      cppWithholding: 15,
      oasWithholding: 15,
      rrspPeriodicWithholding: 15,
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 15
    },
    localIncomeTaxRate: 0, // Remitted foreign pension savings typically shielded under treaty provisions
    localTaxTreatmentNotes: 'Canada-Thailand Tax Treaty reduces Canadian withholding to 15%. Strict treaty shielding on government pensions.',
    healthCareNotes: 'Premier global medical tourism destination (Bumrungrad, Bangkok Hospital). World-class private care at ~20% of North American costs.',
    visaProgram: 'Non-Immigrant O-A Retirement Visa (Age 50+, 800,000 THB in Thai bank or 65,000 THB/month verifiable income).',
    popularRetirementTowns: ['Chiang Mai', 'Hua Hin', 'Phuket', 'Pattaya / Jomtien', 'Koh Samui'],
    climate: 'Warm tropical climate year-round with rich cultural traditions and vibrant expat communities.'
  },
  {
    id: 'panama',
    name: 'Panama',
    flag: '🇵🇦',
    region: 'Americas',
    currencyCode: 'USD',
    currencySymbol: '$',
    exchangeRateToCAD: 0.73, // Uses USD / PAB pegged 1:1
    costOfLivingIndex: 0.58,
    purchasingPowerMultiplier: 1.72,
    hasTaxTreaty: false,
    treatyRates: {
      cppWithholding: 25,
      oasWithholding: 25,
      rrspPeriodicWithholding: 25,
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 25
    },
    localIncomeTaxRate: 0, // 100% Tax-Free locally on foreign income!
    localTaxTreatmentNotes: 'No bilateral treaty (25% CRA Part XIII withholding). Panama is 100% territorial—foreign income pays 0% local income tax.',
    healthCareNotes: 'Johns Hopkins-affiliated Hospital Punta Pacifica in Panama City. Affordable private insurance for retirees.',
    visaProgram: 'Pensionado Visa ($1,000 USD/mo lifetime income) with world-famous discounts (50% off movies, 25% off restaurants, 15% off hospital bills).',
    popularRetirementTowns: ['Boquete (mountain highlands)', 'Coronado (beach)', 'Panama City (modern metropolis)', 'El Valle de Antón', 'Pedasí'],
    climate: 'Highland spring weather in Boquete, tropical coastal weather on the Pacific.'
  },
  {
    id: 'spain',
    name: 'Spain',
    flag: '🇪🇸',
    region: 'Europe',
    currencyCode: 'EUR',
    currencySymbol: '€',
    exchangeRateToCAD: 0.68,
    costOfLivingIndex: 0.70,
    purchasingPowerMultiplier: 1.43,
    hasTaxTreaty: true,
    treatyRates: {
      cppWithholding: 15,
      oasWithholding: 15,
      rrspPeriodicWithholding: 15,
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 15
    },
    localIncomeTaxRate: 12, // Progressive Spanish IRPF with foreign tax credit offsets
    localTaxTreatmentNotes: 'Canada-Spain Tax Treaty limits CRA withholding on periodic pensions to 15%. Foreign tax paid in Canada is credited against Spanish IRPF.',
    healthCareNotes: 'Ranked among top healthcare systems worldwide by WHO. Private insurance required for initial residency visa.',
    visaProgram: 'Non-Lucrative Visa (NLV) - requires passive income of 400% of Spanish IPREM (~€2,400/month) without working locally.',
    popularRetirementTowns: ['Costa del Sol (Málaga, Marbella)', 'Valencia', 'Alicante / Costa Blanca', 'Andalusia (Seville)', 'Canary Islands'],
    climate: 'Mediterranean warmth, vibrant cultural life, walkable cities and world-renowned gastronomy.'
  },
  {
    id: 'usa',
    name: 'United States (Sunbelt / Florida / Arizona)',
    flag: '🇺🇸',
    region: 'Americas',
    currencyCode: 'USD',
    currencySymbol: '$',
    exchangeRateToCAD: 0.73,
    costOfLivingIndex: 1.15, // 15% HIGHER cost of living on average (higher healthcare costs before Medicare)
    purchasingPowerMultiplier: 0.87, // Reduced purchasing power due to USD exchange rate & healthcare
    hasTaxTreaty: true,
    treatyRates: {
      cppWithholding: 0, // Article XVIII of US-Canada Treaty: CPP/OAS taxed ONLY in country of residence!
      oasWithholding: 0, // 0% withholding in Canada; taxed on US 1040 return
      rrspPeriodicWithholding: 15,
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 15
    },
    localIncomeTaxRate: 18, // US Federal + State (0% state in Florida/Texas/Nevada, progressive in California/Arizona)
    localTaxTreatmentNotes: 'Extensive Canada-US Treaty. Article XVIII exempts CPP & OAS from Canadian withholding (taxed only in US). RRSPs remain tax-deferred under IRC 408A. CRITICAL: IRS does NOT recognize TFSAs as tax-exempt (requires complex Form 3520/3520A foreign trust reporting!).',
    healthCareNotes: 'Very expensive private medical insurance and Medicare ineligibility for first 5 years of permanent residency.',
    visaProgram: 'Snowbird B1/B2 (up to 182 days/yr without US tax residency), EB-5 Investor, or Green Card family sponsorship.',
    popularRetirementTowns: ['Palm Springs, CA', 'Phoenix / Scottsdale, AZ', 'Naples / Sarasota, FL', 'St. Petersburg, FL', 'Austin / San Antonio, TX'],
    climate: 'Desert sunshine, subtropical golf communities, familiar North American retail and infrastructure.'
  },
  {
    id: 'philippines',
    name: 'Philippines',
    flag: '🇵🇭',
    region: 'Asia-Pacific',
    currencyCode: 'PHP',
    currencySymbol: '₱',
    exchangeRateToCAD: 41.50,
    costOfLivingIndex: 0.38, // 62% lower cost of living!
    purchasingPowerMultiplier: 2.63, // 2.63x purchasing power!
    hasTaxTreaty: true,
    treatyRates: {
      cppWithholding: 15,
      oasWithholding: 15,
      rrspPeriodicWithholding: 15,
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 15
    },
    localIncomeTaxRate: 0, // Foreign income for resident aliens is exempt from Philippine Bureau of Internal Revenue (BIR) tax
    localTaxTreatmentNotes: 'Canada-Philippines Treaty limits CRA withholding to 15%. Foreign pensions and income derived abroad are exempt from Philippine domestic income tax.',
    healthCareNotes: 'Low out-of-pocket costs, top-tier international hospitals in Metro Manila and Cebu (St. Luke’s Medical Center), widespread English-speaking medical staff.',
    visaProgram: 'SRRV (Special Resident Retiree’s Visa) administered by PRA - age 50+, deposit of $10,000 - $20,000 USD in a designated bank.',
    popularRetirementTowns: ['Dumaguete (University town)', 'Cebu / Mactan', 'Tagaytay (cooler highland climate)', 'Baguio City', 'Subic Bay'],
    climate: 'Tropical warmth, white sand beaches, friendly hospitable culture.'
  },
  {
    id: 'colombia',
    name: 'Colombia',
    flag: '🇨🇴',
    region: 'Americas',
    currencyCode: 'COP',
    currencySymbol: '$',
    exchangeRateToCAD: 3000.0,
    costOfLivingIndex: 0.35,
    purchasingPowerMultiplier: 2.86,
    hasTaxTreaty: false,
    treatyRates: {
      cppWithholding: 25,
      oasWithholding: 25,
      rrspPeriodicWithholding: 25,
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 25
    },
    localIncomeTaxRate: 5,
    localTaxTreatmentNotes: 'No bilateral tax treaty (25% Part XIII CRA withholding applies). Progressive DIAN tax on worldwide income after 183 days of tax residency.',
    healthCareNotes: 'EPS system ranks in top 25 globally by WHO. Medellín and Bogotá boast high-tech medical centers at very low prices.',
    visaProgram: 'Pensioner Visa (Visa de Pensionado - Type M) requires verifiable monthly pension of 3x Colombian minimum wage (~$1,200 CAD/month).',
    popularRetirementTowns: ['Medellín (City of Eternal Spring)', 'Coffee Triangle (Pereira, Manizales)', 'Santa Marta', 'Cali', 'Villa de Leyva'],
    climate: 'Spring-like temperatures year-round at elevation, mountain panoramas, and lush biodiversity.'
  },
  {
    id: 'greece',
    name: 'Greece',
    flag: '🇬🇷',
    region: 'Europe',
    currencyCode: 'EUR',
    currencySymbol: '€',
    exchangeRateToCAD: 0.68,
    costOfLivingIndex: 0.62,
    purchasingPowerMultiplier: 1.61,
    hasTaxTreaty: false, // Negotiations ongoing; default statutory Part XIII currently applies
    treatyRates: {
      cppWithholding: 25,
      oasWithholding: 25,
      rrspPeriodicWithholding: 25,
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 25
    },
    localIncomeTaxRate: 7, // Special 7% flat tax on foreign pensions for 15 years!
    localTaxTreatmentNotes: 'Greece offers an exceptional 7% flat tax regime for 15 years to foreign pensioners who transfer tax residency.',
    healthCareNotes: 'Public ESY system + very affordable private insurance. Excellent doctors, many trained in the UK or US.',
    visaProgram: 'Financially Independent Person (FIP) Visa or Golden Visa via real estate.',
    popularRetirementTowns: ['Crete (Chania, Heraklion)', 'Rhodes', 'Peloponnese (Kalamata, Nafplio)', 'Corfu', 'Athens Riviera'],
    climate: 'Mediterranean island lifestyle, fresh Aegean cuisine, ancient history and endless turquoise coastlines.'
  },
  {
    id: 'italy',
    name: 'Italy',
    flag: '🇮🇹',
    region: 'Europe',
    currencyCode: 'EUR',
    currencySymbol: '€',
    exchangeRateToCAD: 0.68,
    costOfLivingIndex: 0.85,
    purchasingPowerMultiplier: 1.18,
    hasTaxTreaty: true,
    treatyRates: {
      cppWithholding: 15,
      oasWithholding: 15,
      rrspPeriodicWithholding: 15,
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 15
    },
    localIncomeTaxRate: 7, // Special 7% flat tax in Southern Italian municipalities under 20k residents!
    localTaxTreatmentNotes: 'Canada-Italy Tax Treaty limits CRA withholding to 15%. Southern Italian regions (Sicily, Puglia, Calabria, Abruzzo, Sardinia) offer a 7% flat tax on foreign pension income for 10 years.',
    healthCareNotes: 'SSN public healthcare system is consistently ranked among the world’s best.',
    visaProgram: 'Elective Residence Visa (requires proof of passive income ~€32,000/year from pensions or investments).',
    popularRetirementTowns: ['Puglia (Salento, Valle d’Itria)', 'Sicily (Taormina, Siracusa)', 'Tuscany (Lucca, Siena)', 'Abruzzo', 'Lake Como / Garda'],
    climate: 'La Dolce Vita, world-class art and gastronomy, picturesque rolling hills and coastal towns.'
  },
  {
    id: 'vietnam',
    name: 'Vietnam',
    flag: '🇻🇳',
    region: 'Asia-Pacific',
    currencyCode: 'VND',
    currencySymbol: '₫',
    exchangeRateToCAD: 18500.0,
    costOfLivingIndex: 0.33, // 67% lower cost of living!
    purchasingPowerMultiplier: 3.03, // 3x purchasing power!
    hasTaxTreaty: true,
    treatyRates: {
      cppWithholding: 15,
      oasWithholding: 15,
      rrspPeriodicWithholding: 15,
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 15
    },
    localIncomeTaxRate: 0,
    localTaxTreatmentNotes: 'Canada-Vietnam Tax Treaty caps CRA withholding on pensions at 15%.',
    healthCareNotes: 'International clinics (FV Hospital, Vinmec) in Da Nang, Hanoi, and Ho Chi Minh City offer great service at rock-bottom prices.',
    visaProgram: '3-month E-Visas (renewable) or long-term business/investor visas.',
    popularRetirementTowns: ['Da Nang (coastal beach)', 'Hoi An (ancient lantern town)', 'Nha Trang', 'Dalat (cool pine highlands)', 'Phu Quoc Island'],
    climate: 'Tropical coastlines, fresh culinary delicacies, vibrant expat communities, and exceptionally low expenses.'
  },
  {
    id: 'france',
    name: 'France',
    flag: '🇫🇷',
    region: 'Europe',
    currencyCode: 'EUR',
    currencySymbol: '€',
    exchangeRateToCAD: 0.68,
    costOfLivingIndex: 0.80, // ~20% lower cost of living outside Paris
    purchasingPowerMultiplier: 1.25,
    hasTaxTreaty: true,
    treatyRates: {
      cppWithholding: 15,
      oasWithholding: 15,
      rrspPeriodicWithholding: 15, // Article 18 Canada-France Treaty
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 15
    },
    localIncomeTaxRate: 14,
    localTaxTreatmentNotes: 'Canada-France Tax Treaty limits CRA withholding to 15%. French tax authorities grant foreign tax credits to prevent double taxation on Canadian pensions.',
    healthCareNotes: 'PUMA (Protection Universelle Maladie) universal public coverage accessible after 3 months legal residence, complemented by affordable private mutuelle insurance.',
    visaProgram: 'Visiteur Long-Stay Visa (VLS-TS Visiteur) requiring proof of sufficient self-funded passive income (~€1,400/month per adult) and medical coverage.',
    popularRetirementTowns: ['Provence (Aix-en-Provence, Luberon)', 'Côte d’Azur (Nice, Antibes)', 'Dordogne & Sarlat', 'Occitanie (Montpellier, Béziers)', 'Bordeaux Region'],
    climate: 'Sun-drenched Mediterranean south, mild temperate Atlantic west, world-renowned wine regions and rich cultural heritage.'
  },
  {
    id: 'germany',
    name: 'Germany',
    flag: '🇩🇪',
    region: 'Europe',
    currencyCode: 'EUR',
    currencySymbol: '€',
    exchangeRateToCAD: 0.68,
    costOfLivingIndex: 0.82,
    purchasingPowerMultiplier: 1.22,
    hasTaxTreaty: true,
    treatyRates: {
      cppWithholding: 15,
      oasWithholding: 15,
      rrspPeriodicWithholding: 15,
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 15
    },
    localIncomeTaxRate: 15,
    localTaxTreatmentNotes: 'Canada-Germany Tax Treaty caps Canadian withholding at 15%. German Finanzamt provides foreign tax relief against domestic Einkommensteuer.',
    healthCareNotes: 'World-leading statutory (GKV) and private (PKV) healthcare system with modern facilities and high density of specialists.',
    visaProgram: 'Residence Permit for General Employment/Retirement (Aufenthaltserlaubnis) requiring proof of adequate pension income and comprehensive health insurance.',
    popularRetirementTowns: ['Bavarian Alps (Garmisch, Berchtesgaden)', 'Black Forest (Freiburg, Baden-Baden)', 'Lake Constance (Bodensee)', 'Rhine-Neckar Valley (Heidelberg)', 'Munich Suburbs'],
    climate: 'Four distinct seasons, pristine Alpine and Black Forest trails, historic towns, and clean public infrastructure.'
  },
  {
    id: 'uk',
    name: 'United Kingdom',
    flag: '🇬🇧',
    region: 'Europe',
    currencyCode: 'GBP',
    currencySymbol: '£',
    exchangeRateToCAD: 0.58,
    costOfLivingIndex: 1.05,
    purchasingPowerMultiplier: 0.95,
    hasTaxTreaty: true,
    treatyRates: {
      cppWithholding: 15,
      oasWithholding: 15,
      rrspPeriodicWithholding: 15,
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 15
    },
    localIncomeTaxRate: 20,
    localTaxTreatmentNotes: 'Comprehensive Canada-UK Double Taxation Convention prevents double taxation. Canadian withholding tax is creditable against UK HMRC income tax.',
    healthCareNotes: 'Access to the National Health Service (NHS) upon legal settlement, with private health coverage available to bypass clinical waitlists.',
    visaProgram: 'UK Ancestry Visa (for Commonwealth citizens with a UK-born grandparent), Family routes, or self-funded Global Talent / High Net Worth visas.',
    popularRetirementTowns: ['Devon & Cornwall (Torquay, St. Ives)', 'The Cotswolds (Cheltenham, Cirencester)', 'Sussex & Brighton', 'Edinburgh & Scottish Borders', 'York & North Yorkshire'],
    climate: 'Mild maritime climate, rolling green countryside, historical cathedrals, and deeply familiar cultural ties for Canadians.'
  },
  {
    id: 'netherlands',
    name: 'Netherlands',
    flag: '🇳🇱',
    region: 'Europe',
    currencyCode: 'EUR',
    currencySymbol: '€',
    exchangeRateToCAD: 0.68,
    costOfLivingIndex: 0.92,
    purchasingPowerMultiplier: 1.09,
    hasTaxTreaty: true,
    treatyRates: {
      cppWithholding: 15,
      oasWithholding: 15,
      rrspPeriodicWithholding: 15,
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 15
    },
    localIncomeTaxRate: 18,
    localTaxTreatmentNotes: 'Canada-Netherlands Tax Treaty (Article 18) caps Canadian withholding at 15%. Foreign tax credits offset Dutch Belastingdienst liabilities.',
    healthCareNotes: 'Consistently ranked among the best healthcare systems in Europe. Mandatory basic health insurance (basisverzekering ~€140/mo) covers doctor, pharmacy, and hospital care.',
    visaProgram: 'DAFT (Dutch-American/Canadian treaties) or standard temporary residence permit for self-funded independent persons.',
    popularRetirementTowns: ['The Hague (Den Haag)', 'Utrecht', 'Haarlem', 'Groningen (peaceful canal city)', 'Zeeland Coastal Islands'],
    climate: 'Mild temperate maritime climate, iconic canal cities, world-class cycling paths, and over 90% English conversational fluency.'
  },
  {
    id: 'norway',
    name: 'Norway',
    flag: '🇳🇴',
    region: 'Europe',
    currencyCode: 'NOK',
    currencySymbol: 'kr',
    exchangeRateToCAD: 7.90,
    costOfLivingIndex: 1.12,
    purchasingPowerMultiplier: 0.89,
    hasTaxTreaty: true,
    treatyRates: {
      cppWithholding: 15,
      oasWithholding: 15,
      rrspPeriodicWithholding: 15,
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 15
    },
    localIncomeTaxRate: 22,
    localTaxTreatmentNotes: 'Canada-Norway Tax Treaty limits Canadian withholding to 15%. Skatteetaten provides credit relief against ordinary income tax.',
    healthCareNotes: 'Helfo universal national healthcare system with minimal patient co-pays capped annually by the state (Frikort system).',
    visaProgram: 'Residence Permit for Persons of Independent Means or family reunification granted under Norwegian Directorate of Immigration (UDI).',
    popularRetirementTowns: ['Stavanger & Rogaland', 'Bergen (gateway to the fjords)', 'Oslofjord Region (Drammen, Tønsberg)', 'Kristiansand (sunny southern coast)', 'Trondheim'],
    climate: 'Breathtaking fjords and mountains, northern lights in winter, long summer days, high public safety, and active Nordic lifestyle.'
  },
  {
    id: 'india',
    name: 'India',
    flag: '🇮🇳',
    region: 'Asia-Pacific',
    currencyCode: 'INR',
    currencySymbol: '₹',
    exchangeRateToCAD: 62.0,
    costOfLivingIndex: 0.28, // 72% lower cost of living!
    purchasingPowerMultiplier: 3.57, // 3.57x purchasing power boost!
    hasTaxTreaty: true,
    treatyRates: {
      cppWithholding: 15,
      oasWithholding: 15,
      rrspPeriodicWithholding: 15, // Article 19 of Canada-India DTAA
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 15
    },
    localIncomeTaxRate: 5,
    localTaxTreatmentNotes: 'Canada-India Double Tax Avoidance Agreement (DTAA) prevents double taxation. Canadian pensions face 15% CRA withholding with foreign tax credits. RNOR status grants 2-3 years tax holiday on foreign-source income.',
    healthCareNotes: 'World-renowned medical hub (Apollo, Fortis, Max, Manipal). Top-tier private hospital care at 85-90% lower cost than Canada with no waitlists.',
    visaProgram: 'OCI (Overseas Citizen of India) lifelong multi-entry visa for former citizens/descendants, or Entry (X) / Long-term Tourist Visa.',
    popularRetirementTowns: ['Goa (beach lifestyle & Portuguese heritage)', 'Kerala (Kochi, Trivandrum - God’s Own Country)', 'Bangalore / Mysore', 'Pune / Alibaug', 'Dehradun / Rishikesh (Himalayan foothills)'],
    climate: 'Tropical and subtropical warmth, rich cultural tapestry, renowned holistic wellness centers (Ayurveda, Yoga), and dramatic purchasing power leverage.'
  },
  {
    id: 'australia',
    name: 'Australia',
    flag: '🇦🇺',
    region: 'Asia-Pacific',
    currencyCode: 'AUD',
    currencySymbol: '$',
    exchangeRateToCAD: 1.12,
    costOfLivingIndex: 1.02,
    purchasingPowerMultiplier: 0.98,
    hasTaxTreaty: true,
    treatyRates: {
      cppWithholding: 15,
      oasWithholding: 15,
      rrspPeriodicWithholding: 15, // Article 18 Canada-Australia Treaty
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 15
    },
    localIncomeTaxRate: 19,
    localTaxTreatmentNotes: 'Canada-Australia Tax Treaty caps Canadian withholding at 15%. Australian Taxation Office (ATO) provides Foreign Income Tax Offsets (FITO) to eliminate double taxation.',
    healthCareNotes: 'World-class Medicare system, backed by high-standard private hospitals and subsidized pharmaceuticals via the PBS.',
    visaProgram: 'Investor Retirement Visa (Subclass 405/410 renewals), Contributory Parent Visa (Subclass 143), or Business Innovation routes.',
    popularRetirementTowns: ['Sunshine Coast (Noosa, Caloundra)', 'Gold Coast, Queensland', 'Perth & Margaret River, WA', 'Adelaide Hills, SA', 'Byron Bay / Northern Rivers, NSW'],
    climate: 'Over 250 sunny days per year, pristine beaches, vibrant outdoor sporting culture, and exceptionally high standard of living.'
  },
  {
    id: 'new_zealand',
    name: 'New Zealand',
    flag: '🇳🇿',
    region: 'Asia-Pacific',
    currencyCode: 'NZD',
    currencySymbol: '$',
    exchangeRateToCAD: 1.22,
    costOfLivingIndex: 0.98,
    purchasingPowerMultiplier: 1.02,
    hasTaxTreaty: true,
    treatyRates: {
      cppWithholding: 15,
      oasWithholding: 15,
      rrspPeriodicWithholding: 15,
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 15
    },
    localIncomeTaxRate: 17.5,
    localTaxTreatmentNotes: 'Canada-NZ Tax Treaty limits Canadian withholding to 15%. New Zealand offers an extraordinary 4-year Temporary Tax Exemption on foreign passive income for new tax residents.',
    healthCareNotes: 'Comprehensive public healthcare and Accident Compensation Corporation (ACC) covering no-fault injury for all residents and visitors.',
    visaProgram: 'Parent Retirement Resident Visa (NZD $1M investment over 4 years) or Temporary Retirement Visitor Visa (Age 66+, NZD $750k investment).',
    popularRetirementTowns: ['Tauranga & Mount Maunganui (Bay of Plenty)', 'Nelson & Tasman (sunniest region)', 'Hawke’s Bay (Napier, Hastings)', 'Queenstown & Wanaka (Southern Alps)', 'Christchurch'],
    climate: 'Temperate maritime climate, breathtaking alpine fjords, pristine lakes, clean green environment, and relaxed pace of life.'
  },
  {
    id: 'bahamas',
    name: 'Bahamas',
    flag: '🇧🇸',
    region: 'Caribbean',
    currencyCode: 'BSD',
    currencySymbol: '$',
    exchangeRateToCAD: 0.73, // Pegged 1:1 USD
    costOfLivingIndex: 1.20, // Higher cost of living for imported consumer goods
    purchasingPowerMultiplier: 0.83,
    hasTaxTreaty: false,
    treatyRates: {
      cppWithholding: 25,
      oasWithholding: 25,
      rrspPeriodicWithholding: 25,
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 25
    },
    localIncomeTaxRate: 0, // 0% Personal Income Tax locally!
    localTaxTreatmentNotes: 'No bilateral tax treaty (statutory 25% CRA Part XIII withholding applies). However, Bahamas imposes 0% personal income tax, 0% capital gains tax, and 0% inheritance tax.',
    healthCareNotes: 'Modern private hospitals in Nassau (Doctors Hospital, JCI accredited). Emergency air ambulance evacuation to Miami (45 minutes flight) standard for expats.',
    visaProgram: 'Permanent Residency for Persons of Independent Means (accelerated via real estate purchase of $750k+ USD) or Annual Residency Permit.',
    popularRetirementTowns: ['Nassau / New Providence (Lyford Cay, Cable Beach)', 'Paradise Island', 'Grand Bahama (Freeport)', 'Abaco Islands', 'Exuma Cays'],
    climate: 'Year-round subtropical sunshine, world-famous turquoise waters, tax-neutral financial sanctuary, and short flight proximity to Canada.'
  },
  {
    id: 'barbados',
    name: 'Barbados',
    flag: '🇧🇧',
    region: 'Caribbean',
    currencyCode: 'BBD',
    currencySymbol: '$',
    exchangeRateToCAD: 1.46, // Pegged 2:1 USD
    costOfLivingIndex: 0.85,
    purchasingPowerMultiplier: 1.18,
    hasTaxTreaty: true,
    treatyRates: {
      cppWithholding: 15,
      oasWithholding: 15,
      rrspPeriodicWithholding: 15, // Article XVIII Canada-Barbados Treaty
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 15
    },
    localIncomeTaxRate: 12.5,
    localTaxTreatmentNotes: 'Canada-Barbados Tax Treaty reduces Canadian withholding to 15%. Foreign currency earner provisions offer attractive local taxation for expatriates.',
    healthCareNotes: 'Queen Elizabeth Hospital in Bridgetown + private facilities (Bayview Hospital). High standard of general medicine across the island.',
    visaProgram: 'Special Entry and Reside Permit (SERP) for retired property owners and high-net-worth individuals.',
    popularRetirementTowns: ['Platinum West Coast (St. James, Holetown)', 'Christ Church (Hastings, Rockley)', 'St. Peter (Mullins Beach)', 'St. Philip (Crane Beach)', 'Bridgetown Suburbs'],
    climate: 'Constant cooling trade winds, pristine white-sand coral beaches, stable democracy, and vibrant British-Caribbean culture.'
  },
  {
    id: 'virgin_islands',
    name: 'Virgin Islands & Caribbean Islands',
    flag: '🇻🇬',
    region: 'Caribbean',
    currencyCode: 'USD',
    currencySymbol: '$',
    exchangeRateToCAD: 0.73,
    costOfLivingIndex: 1.15,
    purchasingPowerMultiplier: 0.87,
    hasTaxTreaty: false,
    treatyRates: {
      cppWithholding: 25,
      oasWithholding: 25,
      rrspPeriodicWithholding: 25,
      rrspLumpSumWithholding: 25,
      nonRegDividendsWithholding: 25
    },
    localIncomeTaxRate: 0,
    localTaxTreatmentNotes: 'Statutory 25% CRA withholding applies. In the British Virgin Islands, local income and capital gains tax is 0%. In the US Virgin Islands, EDC incentives can provide a 90% reduction on local income tax.',
    healthCareNotes: 'Peebles Hospital in Road Town, Tortola and Roy Lester Schneider Hospital in St. Thomas. Medical helicopter transport to Puerto Rico readily accessible.',
    visaProgram: 'Certificate of Residence for Persons of Independent Means (BVI) or territorial investor/residence routes in the Caribbean basin.',
    popularRetirementTowns: ['Tortola (Road Town, Cane Garden Bay)', 'Virgin Gorda (The Baths, Spanish Town)', 'St. Thomas (Red Hook)', 'St. John (Cruz Bay)', 'Jost Van Dyke'],
    climate: 'Idyllic tropical sailing paradise, secluded anchorages, warm Caribbean waters year-round, and relaxed island lifestyle.'
  }
];

export const DEFAULT_EXPAT_INPUTS: ExpatInputs = {
  planToEmigrate: false,
  emigrationAge: 62,
  destinationCountryId: 'mexico',
  yearsLivedInCanadaAfter18: 30, // Qualifies for lifetime OAS abroad (>= 20 years required)
  realEstateStrategy: 'keep_and_rent',
  optSection216ForRental: true,
  deferDepartureTaxWithT1244: false
};
