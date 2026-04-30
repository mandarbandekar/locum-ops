# Allow multiple attachments on document uploads

Make file pickers across the app accept multiple files at once, and persist each as its own attachment. Drag-and-drop already supports multi-file in the document vault — this brings the rest of the app to parity.

## Surfaces to update

| # | Location | Today | After |
|---|----------|-------|-------|
| 1 | Expenses → Add/Edit Expense → Receipt | 1 receipt only | Multiple receipts per expense |
| 2 | Contracts → Add Contract → Attach File | 1 file | Multiple files per contract |
| 3 | Credentials → Add Credential → Attach Document | 1 file | Multiple files attached to the credential |
| 4 | Credentials → Add CE Entry → Certificate | 1 certificate | Multiple certificates |
| 5 | Compliance Onboarding → both upload steps | 1 file per click | Batch upload |
| 6 | Document Vault → "Replace" version action | 1 file (correct — keep as-is) | unchanged |
| 7 | Facility Import / Setup Assistant lanes | parsing flows | unchanged (already process batches or are parser-specific) |

## Behavior

- File picker opens with `multiple` enabled and a clear "Add more" affordance once files are selected.
- Selected files render as a removable chip list (filename + size + ✕) above the upload button.
- Upload runs sequentially with a progress indicator: "Uploading 2 of 5…". On partial failure, successful files are kept and failed files remain in the chip list with a retry option.
- Toast on completion summarizes counts ("4 files attached, 1 failed").
- Existing single-attachment data is preserved — no migration needed; attachments are added as additional rows or array entries depending on the table.

## Data model touchpoints

Two patterns exist in the schema today:

- **Already many-rows-per-parent** (no schema change): credential documents, CE certificate links can be modeled by inserting multiple `credential_documents` rows tied to the same `credential_id` / CE entry.
- **Single file column on parent** (needs adjustment): `expenses.receipt_url`, `contracts.file_url` currently store one path.

For the single-column cases, the cleanest path is a small companion table per entity (e.g. `expense_attachments`, `contract_attachments`) with `{id, parent_id, user_id, file_path, file_name, uploaded_at}` and standard RLS (`user_id = auth.uid()`). The legacy single column stays populated with the first attachment for backward compatibility with existing UI/PDF/email code, and detail views read from the new table for the full list.

## Technical details

- Add a small reusable `MultiFileDropzone` component in `src/components/ui/` that wraps the `<input type="file" multiple>` + chip list + sequential upload progress, so each surface uses the same UX.
- Storage paths follow existing per-bucket conventions (`{userId}/{uuid}.{ext}`).
- Migrations create `expense_attachments` and `contract_attachments` tables with RLS policies mirroring their parent tables (`owns_expense` / `owns_contract` style checks via `user_id = auth.uid()`).
- Detail views (Expense detail, Contract detail, Credential detail, CE entry detail) get an "Attachments" list with view/download/delete per file, reusing `viewStoredFile` / `downloadStoredFile` from `src/lib/storageUtils.ts`.
- Drag-and-drop already supported in the Document Vault — no change needed there.
- No changes to the Setup Assistant lanes, Facility Import, or the Vault "Replace version" input (semantically single-file).

## Out of scope

- Bulk re-categorization of existing single attachments.
- Changing the PDF/email generation pipelines that currently reference a single `receipt_url` / `file_url` (they keep working against the legacy column).
