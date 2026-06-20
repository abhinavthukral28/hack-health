import type { Patient } from '../types';

// One Synthea-style FHIR R4 patient, normalized to a fixture.
// Clinically coherent so the deep-thread reasoning is real: CKD stage 3 + an
// ACE inhibitor + a potassium-sparing diuretic => a critical-potassium result
// the AI can tie directly to the patient's meds/conditions.
//
// Synthetic data only. No real patient information.

export const patient: Patient = {
  id: 'pt-synthea-001',
  name: 'Margaret Chen',
  dob: '1951-03-14', // 75 yo
  healthCard: '4815-672-093-XA', // OHIP-style (synthetic)
  problems: [
    'Chronic kidney disease, stage 3 (N18.3)',
    'Hypertension (I10)',
    'Type 2 diabetes mellitus (E11.9)',
    'Heart failure with preserved ejection fraction (I50.3)',
  ],
  medications: [
    'Lisinopril 20 mg PO daily (ACE inhibitor)',
    'Spironolactone 25 mg PO daily (K+-sparing diuretic)',
    'Metformin 1000 mg PO BID',
    'Atorvastatin 40 mg PO daily',
  ],
  recentObs: [
    { label: 'Potassium', value: '6.8 mmol/L', flag: 'critical' },
    { label: 'Creatinine', value: '168 µmol/L', flag: 'H' },
    { label: 'eGFR', value: '34 mL/min/1.73m²', flag: 'L' },
    { label: 'HbA1c', value: '8.2 %', flag: 'H' },
  ],
  // Trimmed raw FHIR kept verbatim for the evidence panel's "show me the source" tap.
  raw: {
    resourceType: 'Patient',
    id: 'pt-synthea-001',
    name: [{ family: 'Chen', given: ['Margaret'] }],
    birthDate: '1951-03-14',
    gender: 'female',
    extension: [{ url: 'synthea', valueString: 'synthetic - not a real person' }],
  },
};
