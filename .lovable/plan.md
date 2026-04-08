

# Update to Official 2026 IRS Tax Brackets and Limits

## What's Changing

The current constants use projected/estimated 2026 figures. The IRS released the official 2026 numbers (Revenue Procedure 2025-32, updated for the One Big Beautiful Bill Act). Here are the corrections:

### Federal Brackets (all three filing statuses need updates)

| Status | Current limits | Official 2026 limits |
|---|---|---|
| Single | 11,925 / 48,475 / 103,350 / 197,300 / 250,525 / 626,350 | **12,400 / 50,400 / 105,700 / 201,775 / 256,225 / 640,600** |
| MFJ | 23,850 / 96,950 / 206,700 / 394,600 / 501,050 / 751,600 | **24,800 / 100,800 / 211,400 / 403,550 / 512,450 / 768,700** |
| HoH | 17,000 / 64,850 / 103,350 / 197,300 / 250,500 / 626,350 | **17,700 / 67,450 / 105,700 / 201,775 / 256,200 / 640,600** |

### Standard Deductions

| Status | Current | Official 2026 |
|---|---|---|
| Single | $15,700 | **$16,100** |
| MFJ | $31,400 | **$32,200** |
| HoH | $23,500 | **$24,150** |

### Other Constants

| Item | Current | Official 2026 |
|---|---|---|
| SS Wage Cap | $174,900 | **$184,500** |
| Standard Mileage Rate | $0.70/mi | **$0.725/mi** |
| SEP IRA max | $69,000 | **$72,000** |
| Solo 401(k) employee max | $23,000 | **$23,500** |
| Solo 401(k) total max | $69,000 | **$72,000** |
| SIMPLE IRA employee max | $16,000 | **$16,500** |

### TAX_YEAR_CONFIG updates
- `ssWageBase`: 174900 → **184500**
- `standardMileageRate`: 0.70 → **0.725**
- `lastUpdated`: update to reflect current date

## Implementation

Single file change: **`src/lib/taxConstants2026.ts`** — update all numeric constants listed above. No logic changes, no new files, no database changes. All downstream calculations (TaxDashboard, taxNudge, TaxReductionGuide, etc.) automatically pick up the new values since they import from this file.

