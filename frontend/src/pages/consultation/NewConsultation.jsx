import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchMyPatientProfile } from '../../services/patientService';
import { fetchPublicDoctorProfile } from '../../services/doctorService';
import { createConsultation } from '../../services/consultationService';
import { createPaymentOrder } from '../../services/paymentService';
import { openRazorpayCheckout } from '../../utils/razorpayCheckout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Textarea from '../../components/ui/Textarea';

const STEP_KEYS = ['complaint', 'symptoms', 'context', 'attachments', 'type', 'review'];
const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export default function NewConsultation() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [loadingContext, setLoadingContext] = useState(true);

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [symptomInput, setSymptomInput] = useState('');
  const [symptoms, setSymptoms] = useState([]);
  const [duration, setDuration] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [files, setFiles] = useState([]);
  const [consultationType, setConsultationType] = useState('standard');

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [consultation, setConsultation] = useState(null);

  const DURATION_PRESETS = [
    t('consultation.durationPresets.today'),
    t('consultation.durationPresets.days23'),
    t('consultation.durationPresets.week'),
    t('consultation.durationPresets.weeks2'),
  ];

  useEffect(() => {
    (async () => {
      try {
        const [p, d] = await Promise.all([
          fetchMyPatientProfile(),
          fetchPublicDoctorProfile().catch(() => null),
        ]);
        setProfile(p);
        setDoctor(d);
      } finally {
        setLoadingContext(false);
      }
    })();
  }, []);

  const addSymptom = () => {
    const value = symptomInput.trim();
    if (value && !symptoms.includes(value)) {
      setSymptoms((prev) => [...prev, value]);
    }
    setSymptomInput('');
  };

  const removeSymptom = (value) => setSymptoms((prev) => prev.filter((s) => s !== value));

  const handleFileSelect = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    const rejected = [];
    const accepted = [];

    for (const file of picked) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        rejected.push(`${file.name} — unsupported type`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name} — larger than 5MB`);
        continue;
      }
      accepted.push(file);
    }

    setFiles((prev) => {
      const combined = [...prev, ...accepted];
      if (combined.length > MAX_FILES) {
        rejected.push(`Only ${MAX_FILES} files are allowed`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });

    setErrors((prev) => ({ ...prev, files: rejected.length ? rejected.join('; ') : undefined }));
  };

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const validateStep = (index) => {
    const next = {};
    if (index === 0 && chiefComplaint.trim().length < 5) {
      next.chiefComplaint = t('consultation.complaintError');
    }
    if (index === 1) {
      if (symptoms.length === 0) next.symptoms = t('consultation.symptomsError');
      if (!duration.trim()) next.duration = t('consultation.durationError');
    }
    setErrors((prev) => ({ ...prev, ...next }));
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const ensureConsultationCreated = async () => {
    if (consultation) return consultation;
    const formData = new FormData();
    formData.append('chiefComplaint', chiefComplaint.trim());
    formData.append('symptoms', symptoms.join(','));
    formData.append('duration', duration.trim());
    formData.append('additionalNotes', additionalNotes.trim());
    formData.append('consultationType', consultationType);
    files.forEach((file) => formData.append('attachments', file));

    const created = await createConsultation(formData);
    setConsultation(created);
    return created;
  };

  const handlePayAndSubmit = async () => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const created = await ensureConsultationCreated();
      const order = await createPaymentOrder(created._id);

      await new Promise((resolve) => {
        openRazorpayCheckout({
          order,
          name: t('app.name'),
          description: t(`consultation.type${order.consultationType === 'priority' ? 'Priority' : 'Standard'}`),
          prefill: { name: profile?.name, email: profile?.email, contact: profile?.phone },
          onSuccess: () => {
            setSuccess(true);
            resolve();
          },
          onError: (err, reason) => {
            if (reason === 'cancelled') setSubmitError(t('payment.cancelled'));
            else if (reason === 'failed') setSubmitError(t('payment.failedMessage'));
            else setSubmitError(err.response?.data?.message || t('payment.verifyError'));
            resolve();
          },
        });
      });
    } catch (err) {
      setSubmitError(err.response?.data?.message || t('consultation.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center py-10">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-success-bg flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-ink mb-2">{t('payment.successTitle')}</h1>
          <p className="text-ink-muted mb-6">{t('payment.successMessage')}</p>
          <Button fullWidth size="lg" onClick={() => navigate('/patient/consultations')}>
            {t('consultation.viewMyConsultations')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink tracking-tight">
          {t('consultation.startTitle')}
        </h1>
        <p className="text-ink-muted mt-1 text-[15px]">{t('consultation.startSubtitle')}</p>
      </div>

      <StepIndicator step={step} />

      <Card className="p-6 sm:p-8 mt-6">
        {step === 0 && (
          <StepComplaint value={chiefComplaint} onChange={setChiefComplaint} error={errors.chiefComplaint} />
        )}
        {step === 1 && (
          <StepSymptoms
            symptomInput={symptomInput}
            setSymptomInput={setSymptomInput}
            symptoms={symptoms}
            addSymptom={addSymptom}
            removeSymptom={removeSymptom}
            duration={duration}
            setDuration={setDuration}
            errors={errors}
            presets={DURATION_PRESETS}
          />
        )}
        {step === 2 && (
          <StepMedicalContext
            profile={profile}
            loading={loadingContext}
            additionalNotes={additionalNotes}
            setAdditionalNotes={setAdditionalNotes}
          />
        )}
        {step === 3 && (
          <StepAttachments files={files} onSelect={handleFileSelect} onRemove={removeFile} error={errors.files} />
        )}
        {step === 4 && <StepType value={consultationType} onChange={setConsultationType} doctor={doctor} />}
        {step === 5 && (
          <StepReview
            chiefComplaint={chiefComplaint}
            symptoms={symptoms}
            duration={duration}
            additionalNotes={additionalNotes}
            files={files}
            consultationType={consultationType}
            onEdit={setStep}
            doctor={doctor}
          />
        )}

        {submitError && (
          <p className="mt-4 text-sm text-danger bg-danger-bg border border-danger/20 rounded-control p-3">
            {submitError}
          </p>
        )}

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-line">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={step === 0}
            className="disabled:opacity-0 disabled:pointer-events-none"
          >
            {t('common.back')}
          </Button>
          {step < STEP_KEYS.length - 1 ? (
            <Button type="button" onClick={goNext}>
              {t('common.next')}
            </Button>
          ) : (
            <Button type="button" onClick={handlePayAndSubmit} disabled={submitting}>
              {submitting
                ? t('payment.processing')
                : consultation
                  ? t('payment.retryButton')
                  : t('payment.payAndSubmitButton')}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function StepIndicator({ step }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {STEP_KEYS.map((key, i) => (
          <div key={key} className="flex-1">
            <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-line'}`} />
          </div>
        ))}
      </div>
      <p className="text-xs font-medium text-ink-muted mt-2">
        {t('consultation.stepLabel', {
          current: step + 1,
          total: STEP_KEYS.length,
          label: t(`consultation.steps.${STEP_KEYS[step]}`),
        })}
      </p>
    </div>
  );
}

function StepComplaint({ value, onChange, error }) {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">{t('consultation.complaintTitle')}</h2>
      <p className="text-sm text-ink-muted mt-1 mb-4">{t('consultation.complaintSubtitle')}</p>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        placeholder={t('consultation.complaintPlaceholder')}
        error={error}
      />
      <div className="flex items-center justify-end mt-1.5">
        <span className="text-xs text-ink-muted">{value.length}/1000</span>
      </div>
    </div>
  );
}

function StepSymptoms({
  symptomInput,
  setSymptomInput,
  symptoms,
  addSymptom,
  removeSymptom,
  duration,
  setDuration,
  errors,
  presets,
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ink">{t('consultation.symptomsTitle')}</h2>
        <p className="text-sm text-ink-muted mt-1 mb-4">{t('consultation.symptomsSubtitle')}</p>
        <div className="flex gap-2">
          <input
            value={symptomInput}
            onChange={(e) => setSymptomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addSymptom();
              }
            }}
            placeholder={t('consultation.symptomPlaceholder')}
            className="flex-1 rounded-control border border-line px-3.5 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <Button type="button" variant="outline" onClick={addSymptom}>
            {t('consultation.add')}
          </Button>
        </div>
        {symptoms.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {symptoms.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 bg-mint text-primary-dark text-sm px-3 py-1.5 rounded-control"
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeSymptom(s)}
                  aria-label={`${t('consultation.remove')} ${s}`}
                  className="text-primary-dark/60 hover:text-primary-dark"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {errors.symptoms && <p className="text-sm text-danger mt-2">{errors.symptoms}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-2">{t('consultation.durationLabel')}</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setDuration(preset)}
              className={`px-3 py-1.5 text-sm rounded-control border transition-colors min-h-[38px] ${
                duration === preset
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-ink-muted border-line hover:border-primary/40'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
        <input
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder={t('consultation.durationCustomPlaceholder')}
          className="w-full rounded-control border border-line px-3.5 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        {errors.duration && <p className="text-sm text-danger mt-1.5">{errors.duration}</p>}
      </div>
    </div>
  );
}

function StepMedicalContext({ profile, loading, additionalNotes, setAdditionalNotes }) {
  const { t } = useTranslation();
  const lists = [
    [t('consultation.allergies'), profile?.allergies],
    [t('consultation.existingConditions'), profile?.existingMedicalConditions],
    [t('consultation.currentMedications'), profile?.currentMedications],
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">{t('consultation.contextTitle')}</h2>
      <p className="text-sm text-ink-muted mt-1 mb-4">{t('consultation.contextSubtitle')}</p>

      {loading ? (
        <p className="text-sm text-ink-muted">{t('common.loading')}</p>
      ) : (
        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          {lists.map(([label, items]) => (
            <div key={label} className="bg-surface rounded-control p-3.5">
              <p className="text-xs font-medium text-ink-muted mb-1.5">{label}</p>
              {items && items.length > 0 ? (
                <ul className="text-sm text-ink space-y-0.5">
                  {items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-muted">{t('common.noneOnFile')}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Textarea
        label={t('consultation.notesLabel')}
        value={additionalNotes}
        onChange={(e) => setAdditionalNotes(e.target.value)}
        rows={3}
        placeholder={t('consultation.notesPlaceholder')}
      />
    </div>
  );
}

function StepAttachments({ files, onSelect, onRemove, error }) {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">{t('consultation.attachmentsTitle')}</h2>
      <p className="text-sm text-ink-muted mt-1 mb-4">
        {t('consultation.attachmentsSubtitle', { max: MAX_FILES })}
      </p>

      <label className="flex flex-col items-center justify-center border-2 border-dashed border-line rounded-card py-8 cursor-pointer hover:border-primary/40 hover:bg-mint/30 transition-colors">
        <svg className="w-8 h-8 text-ink-muted mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
          />
        </svg>
        <span className="text-sm text-ink-muted">{t('consultation.uploadCta')}</span>
        <input
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          onChange={onSelect}
          className="hidden"
        />
      </label>
      {error && <p className="text-sm text-danger mt-2">{error}</p>}

      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between bg-surface rounded-control px-3.5 py-2.5"
            >
              <span className="text-sm text-ink truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-sm text-danger hover:underline ml-3 shrink-0"
              >
                {t('consultation.remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StepType({ value, onChange, doctor }) {
  const { t } = useTranslation();
  const options = [
    {
      id: 'standard',
      title: t('consultation.typeStandard'),
      description: t('consultation.typeStandardDesc'),
      fee: doctor?.consultationFee,
    },
    {
      id: 'priority',
      title: t('consultation.typePriority'),
      description: t('consultation.typePriorityDesc'),
      fee: doctor?.priorityConsultationFee,
    },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">{t('consultation.typeTitle')}</h2>
      <p className="text-sm text-ink-muted mt-1 mb-4">{t('consultation.typeSubtitle')}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`text-left rounded-card border p-4 transition-colors ${
              value === opt.id ? 'border-primary ring-2 ring-primary/15 bg-mint/40' : 'border-line hover:border-primary/30'
            }`}
          >
            <p className="font-medium text-ink">{opt.title}</p>
            <p className="text-sm text-ink-muted mt-1">{opt.description}</p>
            {opt.fee != null && <p className="text-sm font-medium text-ink mt-3">₹{opt.fee}</p>}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepReview({ chiefComplaint, symptoms, duration, additionalNotes, files, consultationType, onEdit, doctor }) {
  const { t } = useTranslation();
  const fee = consultationType === 'priority' ? doctor?.priorityConsultationFee : doctor?.consultationFee;
  const sections = [
    {
      title: t('consultation.steps.complaint'),
      step: 0,
      content: <p className="text-sm text-ink whitespace-pre-wrap">{chiefComplaint}</p>,
    },
    {
      title: t('consultation.symptomsTitle'),
      step: 1,
      content: (
        <div className="text-sm text-ink">
          <p>{symptoms.join(', ')}</p>
          <p className="text-ink-muted mt-1">{duration}</p>
        </div>
      ),
    },
    {
      title: t('consultation.reviewNotes'),
      step: 2,
      content: <p className="text-sm text-ink">{additionalNotes || t('common.none')}</p>,
    },
    {
      title: t('consultation.reviewAttachments'),
      step: 3,
      content: (
        <p className="text-sm text-ink">
          {files.length > 0 ? files.map((f) => f.name).join(', ') : t('consultation.noFilesAttached')}
        </p>
      ),
    },
    {
      title: t('consultation.typeTitle'),
      step: 4,
      content: <p className="text-sm text-ink capitalize">{consultationType}</p>,
    },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">{t('consultation.reviewTitle')}</h2>
      <p className="text-sm text-ink-muted mt-1 mb-4">{t('consultation.reviewSubtitle')}</p>
      <div className="space-y-3">
        {sections.map((s) => (
          <div key={s.title} className="border border-line rounded-control p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">{s.title}</p>
              <button
                type="button"
                onClick={() => onEdit(s.step)}
                className="text-xs font-medium text-primary-dark hover:underline"
              >
                {t('common.edit')}
              </button>
            </div>
            {s.content}
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-card bg-mint/50 border border-primary/15 p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-primary-dark uppercase tracking-wide">{t('payment.amountToPay')}</p>
          <p className="text-2xl font-semibold text-ink mt-0.5">
            {fee != null ? `₹${fee}` : t('payment.feeUnavailable')}
          </p>
        </div>
      </div>
      <p className="text-xs text-ink-muted mt-3">{t('payment.secureNote')}</p>
    </div>
  );
}
