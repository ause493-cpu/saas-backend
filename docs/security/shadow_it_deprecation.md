# Shadow IT Deprecation — SSO Revocation List

Critical renewal risks identified from `SaaS_Vendors_Master` → `Active_Licenses`.

**Filter criteria (all must hold):** `Compliance_Status` is exactly `Non-Compliant`, `Renewal_Date` falls within calendar year 2026, and `Annual_Cost` is strictly greater than the dynamic baseline average of **12450**.

The baseline average is the mean `Annual_Cost` across all 2310 `Non-Compliant` records (28759500 / 2310 = 12450).

`Days_To_Renewal` is measured from the reference date 2026-07-15. Records are sorted ascending by `Days_To_Renewal` (most urgent first).

```json
[
  {
    "Integration": "Oracle",
    "Baseline_Avg": 12450,
    "Annual_Cost": 25000,
    "Days_To_Renewal": 46,
    "Instance_Count": 165
  },
  {
    "Integration": "Datadog",
    "Baseline_Avg": 12450,
    "Annual_Cost": 42000,
    "Days_To_Renewal": 82,
    "Instance_Count": 165
  },
  {
    "Integration": "Tableau",
    "Baseline_Avg": 12450,
    "Annual_Cost": 22000,
    "Days_To_Renewal": 95,
    "Instance_Count": 165
  },
  {
    "Integration": "Twilio",
    "Baseline_Avg": 12450,
    "Annual_Cost": 13500,
    "Days_To_Renewal": 118,
    "Instance_Count": 165
  }
]
```
