Strata Canada: Canadian Retirement & Wealth Simulator

Overview

MapleRetire is a comprehensive Canadian retirement simulator designed to help users model their financial future with precision. It provides detailed, long-term projections for RRSP, TFSA, FHSA, and Non-registered savings accounts, while seamlessly integrating Canadian Pension Plan (CPP) and Old Age Security (OAS) benefits. By combining real provincial and federal tax calculations with customizable drawdown strategies, MapleRetire offers a highly accurate and interactive retirement planning experience.

Features

Comprehensive Account Modeling: Simulates contributions, growth, and withdrawals across RRSP, TFSA, FHSA, and Non-registered accounts.

Government Benefits Integration: Estimates CPP and OAS payouts based on projected retirement age.

Accurate Tax Calculations: Incorporates real Canadian federal and provincial tax brackets to calculate accurate after-tax retirement income.

Smart Drawdown Strategies: Test different withdrawal sequences to optimize tax efficiency.

Interactive Controls: Features intuitive sliders (e.g., retirement age) to instantly visualize the impact on long-term wealth.

PDF Reporting: Generates clean, downloadable PDF summaries of retirement projections and strategies.

Technologies

Frontend Framework: React

Build Tool: Vite

Styling: Tailwind CSS

State Management: Zustand

Document Generation: jsPDF

Project Structure Highlights

The application is built with a modular component architecture and centralized state:

Components: Header.tsx, HeroRetirementSlider.tsx, RetirementScorecard.tsx, NetWorthChart.tsx, IncomeStreamChart.tsx, MilestoneTable.tsx

State Management: store/useSimulationStore.ts (powered by Zustand)

Utilities:

utils/canadianTax.ts (Handles complex federal and provincial tax logic)

utils/pdfExport.ts (Manages jsPDF export functionality)

Setup Instructions

To run MapleRetire locally on your machine, follow these steps:

Clone the repository:

git clone https://github.com/ankitbalyan1988/Retirement-Simulator.git


Navigate to the project directory:

cd Retirement-Simulator


Install the dependencies:

npm install


(Note: You can also use yarn install or pnpm install if you prefer.)

Start the development server:

npm run dev


Open the application:
Visit http://localhost:5173 in your browser.

Testing

(Placeholder: Describe your testing framework and commands here. For example, if using Vitest or Jest, include commands like npm run test.)

Deployment

(Placeholder: Add your deployment instructions here. For example, steps to build the Vite project using npm run build and deploy to platforms like Vercel, Netlify, or GitHub Pages.)

Developed by ankitbalyan1988
