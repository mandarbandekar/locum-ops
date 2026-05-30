## Add "Professional Membership Dues" expense category

Add a new subcategory under the existing **Professional Compliance** group in `src/lib/expenseCategories.ts`.

### Change

Insert a new entry after "Board Certification Fees":

- **Label:** Professional Membership Dues
- **Key:** `professional_membership_dues`
- **Deductibility:** Schedule C (100%)
- **Tooltip:** "AVMA, state VMA, and other professional association membership dues"

It will automatically appear in the expense logging dialog's 12-category grid since the UI reads from this single source of truth.

No migration needed — `subcategory` on `expenses` is a free-text column.