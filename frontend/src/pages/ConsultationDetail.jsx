import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchMyConsultationById,
  fetchDoctorConsultationById,
  fetchAttachmentBlob,
} from '../services/consultationService';
import { createPaymentOrder } from '../services/paymentService';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';
import StatusBadge from '../components/StatusBadge';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { PageLoader } from '../components/ui/Loader';

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

      <div className="grid lg:grid-cols-3 gap-5 items-start">
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
              <h1 className="text-lg font-semibold text-ink">{t('consultationDetail.consultationSection')}</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-muted capitalize">{consultation.consultationType}</span>
                <StatusBadge status={consultation.status} />
                <PaymentStatusBadge status={consultation.paymentStatus} />
              </div>
            </div>

            {!isDoctor && consultation.paymentStatus !== 'paid' && (
              <div className="mb-5 rounded-card bg-mint/50 border border-primary/15 p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs font-medium text-primary-dark uppercase tracking-wide">
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

            {!isDoctor && consultation.doctorReply && (
              <div className="mb-5 rounded-card bg-mint/40 border border-primary/15 p-4">
                <p className="text-xs font-semibold text-primary-dark uppercase tracking-wide mb-1.5">
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
                          className="text-sm font-medium text-primary-dark hover:underline ml-3 shrink-0"
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
    <Link to={to} className="inline-flex items-center text-sm font-medium text-primary hover:text-primary-dark mb-5">
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
