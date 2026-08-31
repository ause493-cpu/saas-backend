# Shadow IT Deprecation — SSO Revocation List

Automated Q3 risk assessment derived from `Audits_Master/SaaS_Vendors_Master.xlsm`
(sheet `Active_Licenses`).

## Methodology

1. **Dynamic baseline** — mean `Annual_Cost` across *all* records with
   `Compliance_Status == "Non-Compliant"` (2,310 records, no date filter):
   **$12,450.00**.
2. **Critical risk filter** — vendors matching all three conditions
   simultaneously:
   - `Compliance_Status` is exactly `Non-Compliant`
   - `Renewal_Date` falls within calendar year 2026
   - `Annual_Cost` is strictly greater than the baseline average
3. `Instance_Count` is the number of matching license records per vendor.
   `Days_To_Renewal` is measured from 2026-07-15.

## Finalized data

Sorted ascending by `Days_To_Renewal` (most urgent first).

```json
[
  {
    "Integration": "Oracle",
    "Baseline_Avg": 12450.0,
    "Annual_Cost": 25000.0,
    "Days_To_Renewal": 46,
    "Instance_Count": 165
  },
  {
    "Integration": "Datadog",
    "Baseline_Avg": 12450.0,
    "Annual_Cost": 42000.0,
    "Days_To_Renewal": 82,
    "Instance_Count": 165
  },
  {
    "Integration": "Tableau",
    "Baseline_Avg": 12450.0,
    "Annual_Cost": 22000.0,
    "Days_To_Renewal": 95,
    "Instance_Count": 165
  },
  {
    "Integration": "Twilio",
    "Baseline_Avg": 12450.0,
    "Annual_Cost": 13500.0,
    "Days_To_Renewal": 118,
    "Instance_Count": 165
  }
]
```

## Action required

These integrations must be added to the SSO revocation list before their
respective renewal dates.
