export type ContractType = 'CDI' | 'CDD';

export type TerminationReason =
  | 'standard'
  | 'gross_misconduct'
  | 'serious_misconduct';

export interface SeniorityInput {
  years: number;
  months: number;
}

export interface SeveranceCalculationInput {
  contractType: ContractType;
  terminationReason: TerminationReason;
  seniority: SeniorityInput;
  monthlyGrossSalary: number;
  averageSalary12Months: number;
  averageSalary3Months: number;
  /**
   * 1 = full-time equivalent. Example: 0.8 for 80% part-time.
   */
  partTimeRatio?: number;
}

export interface SeveranceBreakdown {
  partBefore10Years: number;
  partAfter10Years: number;
}

export interface SeveranceCalculationResult {
  isEligible: boolean;
  indemnityAmount: number;
  referenceSalaryUsed: number;
  seniorityInYears: number;
  breakdown: SeveranceBreakdown;
  explanation: string[];
  errors: string[];
}
