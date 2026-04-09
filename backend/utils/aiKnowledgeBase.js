// This file acts as the AI's "context" memory
export const DATABASE_KNOWLEDGE = `
TABLES & COLUMNS:
- patient_master: (patient_id:uuid, patient_name, age, uhid_display, gender_id)
- lab_observation: (PatientID:uuid, LOINCCode, Value:numeric, Observation_Date:timestamp, site_name)
- risk_stratification: (Patient_ID:uuid, RiskScore, RiskCategory)
- medication: (PatientID:uuid, DrugName, Dose, StartDate)
- patient_condition: (patient_id:uuid, icd10_code, onset_date)
- provider_master: (provider_id, provider_name, designation)
- gender_master: (gender_id, gender_name)
- clinic_master: (clinic_id, clinic_name)

MAPPINGS & LOGIC:
- HbA1c LOINC: '4548-4'
- Fasting Blood Sugar (FBS) LOINC: '1558-6' (Example - adjust if different)
- DIABETIC: HbA1c >= 6.5 OR FBS >= 126
- PREDIABETIC: HbA1c BETWEEN 5.7 AND 6.4 OR FBS BETWEEN 100 AND 125
- UNCONTROLLED: HbA1c > 9.0
- JOINING: Always join patient_master.patient_id = lab_observation."PatientID"
- QUOTES: Always use double quotes for mixed-case columns like "PatientID" or "Value".
`;

export const APP_INFO = `
- App: TRUST Diabetes Registry. Built with React/Node/PostgreSQL.
- Features: Predictive Risk Engine (6-month forecast), Registry filtering, AI Analyst.
- Security: Read-Only mode active.
`;