import type {
  SeveranceCalculationInput,
  SeveranceCalculationResult,
} from './typesIndemnitees';

const MIN_ELIGIBILITY_MONTHS = 8;
const TEN_YEARS = 10;
const RATE_BEFORE_TEN_YEARS = 1 / 4;
const RATE_AFTER_TEN_YEARS = 1 / 3;

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toTotalMonths(years: number, months: number): number {
  return years * 12 + months;
}

function toYears(totalMonths: number): number {
  return totalMonths / 12;
}

function validateInput(input: SeveranceCalculationInput): string[] {
  const errors: string[] = [];

  const numericChecks: Array<[string, number]> = [
    ['Seniority years', input.seniority.years],
    ['Seniority months', input.seniority.months],
    ['Monthly gross salary', input.monthlyGrossSalary],
    ['Average salary (12 months)', input.averageSalary12Months],
    ['Average salary (3 months)', input.averageSalary3Months],
    ['Part-time ratio', input.partTimeRatio ?? 1],
  ];

  for (const [label, value] of numericChecks) {
    if (!Number.isFinite(value)) {
      errors.push(`${label} must be a finite number.`);
      continue;
    }

    if (value < 0) {
      errors.push(`${label} cannot be negative.`);
    }
  }

  if (!Number.isInteger(input.seniority.years)) {
    errors.push('Seniority years must be an integer.');
  }

  if (!Number.isInteger(input.seniority.months)) {
    errors.push('Seniority months must be an integer.');
  }

  if (input.seniority.months < 0 || input.seniority.months > 11) {
    errors.push('Seniority months must be between 0 and 11.');
  }

  const partTimeRatio = input.partTimeRatio ?? 1;
  if (partTimeRatio <= 0 || partTimeRatio > 1) {
    errors.push('Part-time ratio must be greater than 0 and less than or equal to 1.');
  }

  return errors;
}

export function calculateLegalSeverance(
  input: SeveranceCalculationInput,
): SeveranceCalculationResult {
  const errors = validateInput(input);

  if (errors.length > 0) {
    return {
      isEligible: false,
      indemnityAmount: 0,
      referenceSalaryUsed: 0,
      seniorityInYears: 0,
      breakdown: {
        partBefore10Years: 0,
        partAfter10Years: 0,
      },
      explanation: ['Calculation could not be completed due to validation errors.'],
      errors,
    };
  }

  const totalMonths = toTotalMonths(input.seniority.years, input.seniority.months);
  const seniorityInYears = toYears(totalMonths);
  const partTimeRatio = input.partTimeRatio ?? 1;

  const rawReferenceSalary = Math.max(
    input.monthlyGrossSalary,
    input.averageSalary12Months,
    input.averageSalary3Months,
  );

  const referenceSalaryUsed = roundTo2(rawReferenceSalary * partTimeRatio);

  const explanation: string[] = [
    `Reference salary is the highest value among base salary (€${roundTo2(
      input.monthlyGrossSalary,
    )}), average over 12 months (€${roundTo2(
      input.averageSalary12Months,
    )}), and average over 3 months (€${roundTo2(input.averageSalary3Months)}).`,
    `A part-time ratio of ${partTimeRatio} is applied, giving a reference salary of €${referenceSalaryUsed}.`,
    `Total seniority considered: ${input.seniority.years} year(s) and ${input.seniority.months} month(s) (${roundTo2(
      seniorityInYears,
    )} years).`,
  ];

  if (input.contractType !== 'CDI') {
    explanation.push('Only CDI employees are eligible for legal severance under this rule set.');
    return {
      isEligible: false,
      indemnityAmount: 0,
      referenceSalaryUsed,
      seniorityInYears: roundTo2(seniorityInYears),
      breakdown: {
        partBefore10Years: 0,
        partAfter10Years: 0,
      },
      explanation,
      errors: [],
    };
  }

  if (input.terminationReason === 'gross_misconduct' || input.terminationReason === 'serious_misconduct') {
    explanation.push('No legal severance is due in case of gross misconduct or serious misconduct.');
    return {
      isEligible: false,
      indemnityAmount: 0,
      referenceSalaryUsed,
      seniorityInYears: roundTo2(seniorityInYears),
      breakdown: {
        partBefore10Years: 0,
        partAfter10Years: 0,
      },
      explanation,
      errors: [],
    };
  }

  if (totalMonths < MIN_ELIGIBILITY_MONTHS) {
    explanation.push('At least 8 months of uninterrupted service are required for eligibility.');
    return {
      isEligible: false,
      indemnityAmount: 0,
      referenceSalaryUsed,
      seniorityInYears: roundTo2(seniorityInYears),
      breakdown: {
        partBefore10Years: 0,
        partAfter10Years: 0,
      },
      explanation,
      errors: [],
    };
  }

  const yearsBefore10 = Math.min(seniorityInYears, TEN_YEARS);
  const yearsAfter10 = Math.max(seniorityInYears - TEN_YEARS, 0);

  const partBefore10Years = roundTo2(referenceSalaryUsed * RATE_BEFORE_TEN_YEARS * yearsBefore10);
  const partAfter10Years = roundTo2(referenceSalaryUsed * RATE_AFTER_TEN_YEARS * yearsAfter10);
  const indemnityAmount = roundTo2(partBefore10Years + partAfter10Years);

  explanation.push(
    `For the first 10 years: ${roundTo2(yearsBefore10)} × 1/4 month × €${referenceSalaryUsed} = €${partBefore10Years}.`,
  );
  explanation.push(
    `After 10 years: ${roundTo2(yearsAfter10)} × 1/3 month × €${referenceSalaryUsed} = €${partAfter10Years}.`,
  );
  explanation.push(`Estimated legal severance amount: €${indemnityAmount}.`);

  return {
    isEligible: true,
    indemnityAmount,
    referenceSalaryUsed,
    seniorityInYears: roundTo2(seniorityInYears),
    breakdown: {
      partBefore10Years,
      partAfter10Years,
    },
    explanation,
    errors: [],
  };
}
