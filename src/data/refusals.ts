export interface Refusal {
  date: string;
  amount: string;
  type: string;
  counterparty: string;
  answer: string;
}

/** Public ledger of declined paid-influence offers. Starts at zero. */
export const refusals: Refusal[] = [];
