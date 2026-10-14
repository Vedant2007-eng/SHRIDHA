import { FeedbackAnswer, FeedbackReport, SupportedLanguage } from '../types/feedback';

export const analyzeFeedback = async (
  answers: FeedbackAnswer[],
  language: SupportedLanguage = 'English'
): Promise<FeedbackReport> => {
  // Simulate AI processing delay if called directly
  await new Promise((res) => setTimeout(res, 600));

  const allText = answers.map((a) => a.transcript.toLowerCase()).join(' ');

  // Dynamic sentiment & score adjustments based on answers if text is present
  let cleanlinessScore = 85;
  let staffBehaviourScore = 78;
  let doctorTreatmentScore = 88;
  let medicineSupportScore = 76;

  // Question 1 analysis (Cleanliness & Facilities)
  const q1Text = answers.find((a) => a.questionId === 1)?.transcript.toLowerCase() || '';
  if (q1Text.includes('dirty') || q1Text.includes('bad') || q1Text.includes('washroom') || q1Text.includes('खराब') || q1Text.includes('घाण')) {
    cleanlinessScore = Math.max(60, cleanlinessScore - 12);
  } else if (q1Text.includes('excellent') || q1Text.includes('good') || q1Text.includes('clean') || q1Text.includes('छान') || q1Text.includes('अच्छा')) {
    cleanlinessScore = Math.min(96, cleanlinessScore + 6);
  }

  // Question 2 analysis (Staff & Medicine)
  const q2Text = answers.find((a) => a.questionId === 2)?.transcript.toLowerCase() || '';
  if (q2Text.includes('late') || q2Text.includes('rude') || q2Text.includes('delay') || q2Text.includes('उशीर') || q2Text.includes('देरी')) {
    staffBehaviourScore = Math.max(58, staffBehaviourScore - 10);
    medicineSupportScore = Math.max(62, medicineSupportScore - 8);
  } else if (q2Text.includes('kind') || q2Text.includes('polite') || q2Text.includes('helpful') || q2Text.includes('मदत') || q2Text.includes('सहयोग')) {
    staffBehaviourScore = Math.min(94, staffBehaviourScore + 7);
    medicineSupportScore = Math.min(90, medicineSupportScore + 6);
  }

  // Question 3 analysis (Doctor treatment)
  const q3Text = answers.find((a) => a.questionId === 3)?.transcript.toLowerCase() || '';
  if (q3Text.includes('satisfied') || q3Text.includes('best') || q3Text.includes('great') || q3Text.includes('समाधानी') || q3Text.includes('संतुष्ट')) {
    doctorTreatmentScore = Math.min(97, doctorTreatmentScore + 5);
  } else if (q3Text.includes('dissatisfied') || q3Text.includes('poor') || q3Text.includes('नाराज')) {
    doctorTreatmentScore = Math.max(64, doctorTreatmentScore - 14);
  }

  const overall = Math.round(
    cleanlinessScore * 0.25 +
    staffBehaviourScore * 0.25 +
    doctorTreatmentScore * 0.3 +
    medicineSupportScore * 0.2
  );

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const randomId = Math.floor(1000 + Math.random() * 9000);
  const feedbackId = `#CV${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${randomId}`;

  let status: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'POOR' = 'GOOD';
  let statusDescription = 'The hospital is performing well overall with positive feedback. There are some areas that need attention.';

  if (overall >= 90) {
    status = 'EXCELLENT';
    statusDescription = 'Exceptional patient satisfaction across all major hospital departments and care units.';
  } else if (overall >= 75) {
    status = 'GOOD';
    statusDescription = 'The hospital is performing well overall with positive feedback. There are some areas that need attention.';
  } else if (overall >= 60) {
    status = 'NEEDS_ATTENTION';
    statusDescription = 'Moderate feedback received. Key corrective actions needed in staff responsiveness and facility maintenance.';
  } else {
    status = 'POOR';
    statusDescription = 'Urgent operational attention required to address critical patient concerns.';
  }

  const positiveFeedback = [
    'Clean and well-maintained wards and waiting areas.',
    'Doctors were professional and explained the treatment clearly.',
    'Nursing staff was helpful, attentive and supportive.',
    'Timely response during emergency assistance.',
    'Overall good experience with hospital inpatient & outpatient care.',
  ];

  const issues = [
    'Some washrooms need better cleanliness and regular sanitization checks.',
    'Waiting time for scheduled medicine doses was sometimes delayed.',
    'A few reception and support staff members were not sufficiently responsive.',
    'More seating arrangements are needed in busy outpatient waiting halls.',
    'Need clearer communication regarding lab test reports and discharge paperwork.',
  ];

  const suggestions = [
    'Ensure scheduled hourly cleaning and hygiene logs for public washrooms.',
    'Provide comfortable additional seating in OPD corridors and waiting areas.',
    'Conduct staff soft-skills and empathetic communication refresher sessions.',
    'Implement digital medicine schedule tracking to guarantee on-time doses.',
    'Display prominent multilingual signboards for easy department navigation.',
  ];

  return {
    feedbackId,
    date: dateFormatted,
    time: timeFormatted,
    language,
    overallScore: overall,
    status,
    statusDescription,
    categories: {
      cleanliness: cleanlinessScore,
      staffBehaviour: staffBehaviourScore,
      doctorTreatment: doctorTreatmentScore,
      medicineSupport: medicineSupportScore,
      overallService: overall,
    },
    radarData: [
      { subject: 'Cleanliness', score: cleanlinessScore, benchmark: 80, fullMark: 100 },
      { subject: 'Staff Behaviour', score: staffBehaviourScore, benchmark: 75, fullMark: 100 },
      { subject: 'Doctor Treatment', score: doctorTreatmentScore, benchmark: 85, fullMark: 100 },
      { subject: 'Medicine Service', score: medicineSupportScore, benchmark: 70, fullMark: 100 },
      { subject: 'Overall Service', score: overall, benchmark: 80, fullMark: 100 },
    ],
    positiveFeedback,
    issues,
    suggestions,
    patientAnswers: answers,
  };
};
