import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchMyConsultationById,
  fetchDoctorConsultationById,
  fetchAttachmentBlob,
  fetchPrescriptionBlob,
  submitManualDoctorReply,
} from '../services/consultationService';
import { createPaymentOrder } from '../services/paymentService';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';
import { fetchVideoSummaryByConsultation } from '../services/videoService';
import { useToast } from '../contexts/ToastContext';
import StatusBadge from '../components/StatusBadge';
import ConsultationProgress from '../components/ConsultationProgress';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Textarea from '../components/ui/Textarea';
import { PageLoader } from '../components/ui/Loader';
import { CheckCircleIcon, ClockIcon, VideoIcon } from '../components/layout/icons';

export default function ConsultationDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';

  const [consultation, setConsultation] = useState(null);
  const [patient, setPatient] = useState(null);
  const [previousConsultations, setPreviousConsultations] = useState([]);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [prescriptionBusy, setPrescriptionBusy] = useState('');
  const [prescriptionError, setPrescriptionError] = useState('');
  const [prescriptionLang, setPrescriptionLang] = useState('en');
  const [videoSummary, setVideoSummary] = useState(null);
  const [manualReplyText, setManualReplyText] = useState('');
  const [manualReplySubmitting, setManualReplySubmitting] = useState(false);
  const [manualReplyError, setManualReplyError] = useState('');
  const notify = useToast();

  useEffect(() => {
    (async () => {
      try {
        if (isDoctor) {
          const data = await fetchDoctorConsultationById(id);
          setConsultation(data.consultation);
          setPatient(data.consultation.patientId);
          setPreviousConsultations(data.previousConsultations || []);
        } else {
          setConsultation(await fetchMyConsultationById(id));
        }
      } catch (err) {
        setError(err.response?.data?.message || t('consultationDetail.loadError'));
      }
    })();
  }, [id, isDoctor, t]);

  // Video session state lives in a separate collection — only relevant, and only fetched,
  // for the doctor's view of a video-type consultation.
  useEffect(() => {
    if (!isDoctor || consultation?.consultationType !== 'video') return;
    fetchVideoSummaryByConsultation(id)
      .then(setVideoSummary)
      .catch(() => setVideoSummary(null));
  }, [id, isDoctor, consultation?.consultationType]);

  const handlePayNow = async () => {
    setPaymentError('');
    setPaying(true);
    try {
      const order = await createPaymentOrder(consultation._id);
      await new Promise((resolve) => {
        openRazorpayCheckout({
          order,
          name: t('app.name'),
          description: t(`consultation.type${order.consultationType === 'priority' ? 'Priority' : 'Standard'}`),
          prefill: { name: user?.name, email: user?.email, contact: user?.phone },
          onSuccess: (result) => {
            setConsultation((prev) => ({
              ...prev,
              paymentStatus: result.paymentStatus,
              paymentAmount: result.amount,
              paidAt: result.paidAt,
            }));
            notify(t('payment.successTitle'), { tone: 'success' });
            resolve();
          },
          onError: (err, reason) => {
            if (reason === 'cancelled') setPaymentError(t('payment.cancelled'));
            else if (reason === 'failed') setPaymentError(t('payment.failedMessage'));
            else setPaymentError(err.response?.data?.message || t('payment.verifyError'));
            resolve();
          },
        });
      });
    } catch (err) {
      setPaymentError(err.response?.data?.message || t('payment.orderError'));
    } finally {
      setPaying(false);
    }
  };

  const handleManualReplySubmit = async (e) => {
    e.preventDefault();
    setManualReplyError('');
    setManualReplySubmitting(true);
    try {
      const updated = await submitManualDoctorReply(id, manualReplyText.trim());
      setConsultation(updated);
      setManualReplyText('');
      notify(t('consultationDetail.manualReply.success'), { tone: 'success' });
    } catch (err) {
      setManualReplyError(err.response?.data?.message || t('consultationDetail.manualReply.error'));
    } finally {
      setManualReplySubmitting(false);
    }
  };

  const openAttachment = async (attachmentId) => {
    try {
      const { blob } = await fetchAttachmentBlob(id, attachmentId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setError('Failed to open attachment');
    }
  };

  const handleViewPrescription = async () => {
    setPrescriptionError('');
    setPrescriptionBusy('view');
    try {
      const blob = await fetchPrescriptionBlob(id, prescriptionLang);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setPrescriptionError(err.response?.data?.message || t('prescription.loadError'));
    } finally {
      setPrescriptionBusy('');
    }
  };

  const handleDownloadPrescription = async () => {
    setPrescriptionError('');
    setPrescriptionBusy('download');
    try {
      const blob = await fetchPrescriptionBlob(id, prescriptionLang);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Healthify-Prescription-${consultation?._id?.slice(-6).toUpperCase() || ''}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setPrescriptionError(err.response?.data?.message || t('prescription.loadError'));
    } finally {
      setPrescriptionBusy('');
    }
  };

  const backTo = isDoctor ? '/doctor/consultations' : '/patient/consultations';

  if (error) {
    return (
      <div>
        <BackLink to={backTo} label={t('consultationDetail.back')} />
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  if (!consultation) return <PageLoader label={t('common.loading')} />;

  return (
    <div>
      <BackLink to={backTo} label={t('consultationDetail.back')} />

      <div className="grid lg:grid-cols-3 gap-5 items-start [&>*]:min-w-0">
        {isDoctor && patient && (
          <Card className="p-6 lg:order-2 lg:col-span-1 lg:sticky lg:top-24">
            <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">
              {t('consultationDetail.patientSection')}
            </h2>
            <div className="space-y-2.5 text-sm">
              <Field label={t('consultationDetail.name')} value={patient.name} />
              <Field label={t('consultationDetail.email')} value={patient.email} />
              <Field label={t('consultationDetail.phone')} value={patient.phone} />
              <Field label={t('consultationDetail.location')} value={patient.location} />
              <Field label={t('consultationDetail.gender')} value={patient.gender} />
              <Field label={t('consultationDetail.bloodGroup')} value={patient.bloodGroup} />
              <Field
                label={t('consultationDetail.dateOfBirth')}
                value={patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : null}
              />
              <Field
                label={t('consultationDetail.emergencyContact')}
                value={
                  patient.emergencyContact?.name
                    ? `${patient.emergencyContact.name} (${patient.emergencyContact.relation || 'n/a'}) — ${
                        patient.emergencyContact.phone || 'n/a'
                      }`
                    : null
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-3 mt-5 pt-5 border-t border-line">
              <TagList label={t('consultation.allergies')} items={patient.allergies} />
              <TagList label={t('consultation.existingConditions')} items={patient.existingMedicalConditions} />
              <TagList label={t('consultation.currentMedications')} items={patient.currentMedications} />
            </div>
          </Card>
        )}

        <div className={`space-y-5 lg:order-1 ${isDoctor ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <h1 className="font-display font-bold text-xl text-ink">{t('consultationDetail.consultationSection')}</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-muted capitalize">{consultation.consultationType}</span>
                <StatusBadge status={consultation.status} />
                <PaymentStatusBadge status={consultation.paymentStatus} />
              </div>
            </div>

            {!isDoctor && (
              <div className="mb-6 rounded-2xl border border-line/70 bg-surface-muted/40 px-4 pb-3 pt-1">
                <ConsultationProgress consultation={consultation} />
              </div>
            )}

            {isDoctor && consultation.paymentStatus === 'paid' && (
              <WhatsAppStatusStrip consultation={consultation} t={t} />
            )}

            {isDoctor && consultation.consultationType === 'video' && (
              <VideoStatusCard summary={videoSummary} t={t} />
            )}

            {isDoctor && consultation.paymentStatus === 'paid' && !consultation.doctorReply && (
              <div className="mb-5 rounded-card border border-line p-4">
                <p className="text-sm font-semibold text-ink mb-1">{t('consultationDetail.manualReply.title')}</p>
                <p className="text-xs text-ink-muted mb-3">{t('consultationDetail.manualReply.hint')}</p>
                <form onSubmit={handleManualReplySubmit}>
                  <Textarea
                    value={manualReplyText}
                    onChange={(e) => setManualReplyText(e.target.value)}
                    rows={4}
                    placeholder={t('consultationDetail.manualReply.placeholder')}
                    maxLength={4000}
                    aria-label={t('consultationDetail.manualReply.title')}
                  />
                  {manualReplyError && <p className="text-sm text-danger mt-2">{manualReplyError}</p>}
                  <div className="flex justify-end mt-3">
                    <Button
                      type="submit"
                      disabled={manualReplySubmitting || manualReplyText.trim().length < 5}
                    >
                      {manualReplySubmitting ? t('common.saving') : t('consultationDetail.manualReply.submit')}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {!isDoctor && consultation.paymentStatus !== 'paid' && (
              <div className="mb-5 rounded-card bg-mint/50 border border-primary/15 p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs font-medium text-primary-light uppercase tracking-wide">
                      {t('payment.amountToPay')}
                    </p>
                    <p className="text-xl font-semibold text-ink mt-0.5">
                      {consultation.paymentAmount != null ? `₹${consultation.paymentAmount}` : t('payment.feeUnavailable')}
                    </p>
                  </div>
                  <Button onClick={handlePayNow} disabled={paying}>
                    {paying ? t('payment.processing') : t('payment.payNowButton')}
                  </Button>
                </div>
                {paymentError && <p className="text-sm text-danger mt-3">{paymentError}</p>}
              </div>
            )}

            {isDoctor && consultation.paymentStatus === 'paid' && (
              <p className="text-xs text-ink-muted mb-5">
                {t('payment.paidSummary', {
                  amount: consultation.paymentAmount,
                  date: consultation.paidAt ? new Date(consultation.paidAt).toLocaleString() : '',
                })}
              </p>
            )}

            {!isDoctor && consultation.paymentStatus === 'paid' && !consultation.doctorReply && (
              <p className="text-sm text-ink-muted bg-surface rounded-control p-3.5 mb-5">
                {consultation.status === 'under_review'
                  ? t('consultationDetail.doctorNotified')
                  : t('consultationDetail.awaitingResponse')}
              </p>
            )}

            {consultation.doctorReply && (
              <div className="mb-5 rounded-card bg-mint/40 border border-primary/15 p-4">
                <p className="text-xs font-semibold text-primary-light uppercase tracking-wide mb-1.5">
                  {t('consultationDetail.doctorResponse')}
                </p>
                <p className="text-[15px] text-ink whitespace-pre-wrap">{consultation.doctorReply}</p>
                {consultation.doctorRepliedAt && (
                  <p className="text-xs text-ink-muted mt-2">
                    {t('consultationDetail.respondedOn', {
                      date: new Date(consultation.doctorRepliedAt).toLocaleString(),
                    })}
                  </p>
                )}
              </div>
            )}

            {consultation.doctorReply && consultation.prescriptionStatus === 'generated' && (
              <div className="mb-5 rounded-card border border-line p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-ink">{t('prescription.available')}</p>
                    {consultation.prescriptionGeneratedAt && (
                      <p className="text-xs text-ink-muted mt-0.5">
                        {t('prescription.generatedOn', {
                          date: new Date(consultation.prescriptionGeneratedAt).toLocaleDateString(),
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div
                      className="inline-flex items-center bg-surface border border-line rounded-control p-0.5 text-sm"
                      role="group"
                      aria-label={t('prescription.language')}
                    >
                      {['en', 'hi'].map((lng) => (
                        <button
                          key={lng}
                          type="button"
                          onClick={() => setPrescriptionLang(lng)}
                          aria-pressed={prescriptionLang === lng}
                          className={`px-2.5 py-1.5 rounded-[8px] font-medium transition-colors min-h-[36px] ${
                            prescriptionLang === lng ? 'bg-primary text-canvas shadow-soft' : 'text-ink-muted hover:text-ink'
                          }`}
                        >
                          {lng === 'en' ? 'EN' : 'हि'}
                        </button>
                      ))}
                    </div>
                    <Button variant="outline" onClick={handleViewPrescription} disabled={!!prescriptionBusy}>
                      {prescriptionBusy === 'view' ? t('common.loading') : t('prescription.view')}
                    </Button>
                    <Button onClick={handleDownloadPrescription} disabled={!!prescriptionBusy}>
                      {prescriptionBusy === 'download' ? t('common.loading') : t('prescription.download')}
                    </Button>
                  </div>
                </div>
                {prescriptionError && <p className="text-sm text-danger mt-3">{prescriptionError}</p>}
              </div>
            )}

            {consultation.doctorReply && consultation.prescriptionStatus === 'none' && (
              <p className="text-sm text-ink-muted bg-surface rounded-control p-3.5 mb-5">
                {t('prescription.preparing')}
              </p>
            )}

            {consultation.doctorReply && consultation.prescriptionStatus === 'failed' && (
              <p className="text-sm text-warning bg-warning-bg rounded-control p-3.5 mb-5">
                {t('prescription.generationFailed')}
              </p>
            )}

            <div className="space-y-5">
              <Block label={t('consultationDetail.chiefComplaint')} content={consultation.chiefComplaint} />
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
                  {t('consultationDetail.symptoms')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {consultation.symptoms.map((s) => (
                    <span key={s} className="bg-mint text-primary-dark text-sm px-3 py-1 rounded-control">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <Block label={t('consultationDetail.duration')} content={consultation.duration} />
              {consultation.additionalNotes && (
                <Block label={t('consultationDetail.additionalNotes')} content={consultation.additionalNotes} />
              )}

              <div className="grid sm:grid-cols-3 gap-3">
                <TagList label={t('consultationDetail.allergiesSnapshot')} items={consultation.allergiesSnapshot} />
                <TagList
                  label={t('consultationDetail.conditionsSnapshot')}
                  items={consultation.medicalHistorySnapshot}
                />
                <TagList
                  label={t('consultationDetail.medicationsSnapshot')}
                  items={consultation.currentMedicationsSnapshot}
                />
              </div>

              {consultation.attachments?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
                    {t('consultationDetail.attachments')}
                  </p>
                  <ul className="space-y-2">
                    {consultation.attachments.map((a) => (
                      <li
                        key={a._id}
                        className="flex items-center justify-between bg-surface rounded-control px-3.5 py-2.5"
                      >
                        <span className="text-sm text-ink truncate">{a.originalName}</span>
                        <button
                          onClick={() => openAttachment(a._id)}
                          className="text-sm font-medium text-primary-light hover:underline ml-3 shrink-0"
                        >
                          {t('common.view')}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-ink-muted pt-4 border-t border-line">
                {t('consultationDetail.submittedOn', { date: new Date(consultation.createdAt).toLocaleString() })}
              </p>
            </div>
          </Card>

          {isDoctor && previousConsultations.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">
                {t('consultationDetail.previousConsultations')}
              </h2>
              <ul className="divide-y divide-line">
                {previousConsultations.map((c) => (
                  <li key={c._id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-ink truncate">{c.chiefComplaint}</p>
                      <p className="text-xs text-ink-muted">{new Date(c.createdAt).toLocaleDateString()}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function BackLink({ to, label }) {
  return (
    <Link to={to} className="inline-flex items-center text-sm font-medium text-primary hover:text-primary-light mb-5">
      ← {label}
    </Link>
  );
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="text-ink">{value}</p>
    </div>
  );
}

function Block({ label, content }) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-[15px] text-ink whitespace-pre-wrap">{content}</p>
    </div>
  );
}

// Operational status only — never renders wamid/Meta message IDs, just what already happened.
function WhatsAppStatusStrip({ consultation, t }) {
  const steps = [
    { done: !!consultation.whatsappNotifiedAt, label: t('consultationDetail.whatsapp.notified') },
    {
      done: ['delivered', 'read'].includes(consultation.whatsappDeliveryStatus),
      label:
        consultation.whatsappDeliveryStatus === 'read'
          ? t('consultationDetail.whatsapp.read')
          : t('consultationDetail.whatsapp.delivered'),
    },
    { done: !!consultation.doctorRepliedAt, label: t('consultationDetail.whatsapp.replied') },
    { done: consultation.prescriptionStatus === 'generated', label: t('consultationDetail.whatsapp.prescriptionReady') },
  ];

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 bg-surface rounded-control p-3.5">
      {steps.map((step) => (
        <span
          key={step.label}
          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
            step.done ? 'text-ink' : 'text-ink-muted/60'
          }`}
        >
          {step.done ? (
            <CheckCircleIcon className="w-3.5 h-3.5 text-success" />
          ) : (
            <ClockIcon className="w-3.5 h-3.5" />
          )}
          {step.label}
        </span>
      ))}
    </div>
  );
}

const VIDEO_STATUS_LABEL_KEY = {
  queued: 'consultationDetail.video.queued',
  ready: 'consultationDetail.video.ready',
  active: 'consultationDetail.video.active',
  completed: 'consultationDetail.video.completed',
  cancelled: 'consultationDetail.video.cancelled',
  expired: 'consultationDetail.video.expired',
  no_show: 'consultationDetail.video.noShow',
  failed: 'consultationDetail.video.failed',
};

function VideoStatusCard({ summary, t }) {
  return (
    <div className="mb-5 rounded-card border border-line p-4">
      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <VideoIcon className="w-3.5 h-3.5" />
        {t('consultationDetail.video.title')}
      </p>
      {!summary ? (
        <p className="text-sm text-ink-muted">{t('consultationDetail.video.notStarted')}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink">
          <span>{t(VIDEO_STATUS_LABEL_KEY[summary.status] || 'consultationDetail.video.notStarted')}</span>
          {summary.startedAt && (
            <span className="text-ink-muted text-xs">
              {t('consultationDetail.video.startedAt', { time: new Date(summary.startedAt).toLocaleString() })}
            </span>
          )}
          {summary.endedAt && (
            <span className="text-ink-muted text-xs">
              {t('consultationDetail.video.endedAt', { time: new Date(summary.endedAt).toLocaleString() })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function TagList({ label, items }) {
  const { t } = useTranslation();
  return (
    <div className="bg-surface rounded-control p-3.5">
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
  );
}
