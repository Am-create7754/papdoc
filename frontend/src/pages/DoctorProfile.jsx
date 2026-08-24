import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fetchMyDoctorProfile,
  updateMyDoctorProfile,
  uploadDoctorSignature,
  signatureImageUrl,
} from '../services/doctorService';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Button from '../components/ui/Button';
import { PageLoader } from '../components/ui/Loader';

const ARRAY_FIELDS = [
  'qualifications',
  'areasOfExpertise',
  'commonlyTreatedConditions',
  'languages',
  'professionalAchievements',
];

const NUMBER_FIELDS = [
  'yearsOfExperience',
  'consultationFee',
  'priorityConsultationFee',
  'videoConsultationFee',
];

const TEXT_FIELDS = [
  'fullName',
  'profilePhoto',
  'specialization',
  'medicalRegistrationNumber',
  'clinicName',
  'clinicAddress',
  'city',
  'bio',
];

function toFormState(profile) {
  const state = {};
  TEXT_FIELDS.forEach((f) => (state[f] = profile[f] || ''));
  NUMBER_FIELDS.forEach((f) => (state[f] = profile[f] ?? ''));
  ARRAY_FIELDS.forEach((f) => (state[f] = (profile[f] || []).join(', ')));
  state.videoConsultationEnabled = !!profile.videoConsultationEnabled;
  return state;
}

function toPayload(form) {
  const payload = {};
  TEXT_FIELDS.forEach((f) => {
    if (form[f] !== '') payload[f] = form[f];
  });
  NUMBER_FIELDS.forEach((f) => {
    if (form[f] !== '') payload[f] = Number(form[f]);
  });
  ARRAY_FIELDS.forEach((f) => {
    payload[f] = form[f]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  });
  payload.videoConsultationEnabled = form.videoConsultationEnabled;
  return payload;
}

export default function DoctorProfile() {
  const { t } = useTranslation();
  const [form, setForm] = useState(null);
  const [signatureImage, setSignatureImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [signatureError, setSignatureError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const profile = await fetchMyDoctorProfile();
        setForm(toFormState(profile));
        setSignatureImage(profile.signatureImage || null);
      } catch (err) {
        setError(err.response?.data?.message || t('profile.loadError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSignatureError('');
    setSignatureUploading(true);
    try {
      const updated = await uploadDoctorSignature(file);
      setSignatureImage(updated.signatureImage || null);
    } catch (err) {
      setSignatureError(err.response?.data?.message || t('profile.signatureUploadError'));
    } finally {
      setSignatureUploading(false);
    }
  };

  const handleChange = (field) => (e) => {
    const value = field === 'videoConsultationEnabled' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const updated = await updateMyDoctorProfile(toPayload(form));
      setForm(toFormState(updated));
      setSuccess(t('profile.saveSuccess'));
    } catch (err) {
      setError(err.response?.data?.message || t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader label={t('common.loading')} />;
  if (!form) return <p className="text-danger">{error}</p>;

  return (
    <div>
      <PageHeader title={t('profile.doctorTitle')} backTo="/doctor" backLabel={t('profile.back')} />

      {error && (
        <p className="mb-4 text-sm text-danger bg-danger-bg border border-danger/20 rounded-control p-3">{error}</p>
      )}
      {success && (
        <p className="mb-4 text-sm text-success bg-success-bg border border-success/20 rounded-control p-3">
          {success}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label={t('profile.fullName')} value={form.fullName} onChange={handleChange('fullName')} />
            <Input
              label={t('profile.profilePhoto')}
              value={form.profilePhoto}
              onChange={handleChange('profilePhoto')}
            />
            <Input
              label={t('profile.specialization')}
              value={form.specialization}
              onChange={handleChange('specialization')}
            />
            <Input
              label={t('profile.medicalRegistrationNumber')}
              value={form.medicalRegistrationNumber}
              onChange={handleChange('medicalRegistrationNumber')}
            />
            <Input
              label={t('profile.yearsOfExperience')}
              type="number"
              value={form.yearsOfExperience}
              onChange={handleChange('yearsOfExperience')}
            />
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm font-medium text-ink mb-1">{t('profile.signatureImage')}</p>
          <p className="text-xs text-ink-muted mb-4">{t('profile.signatureImageHint')}</p>
          <div className="flex items-center gap-4">
            {signatureImage ? (
              <img
                src={signatureImageUrl(signatureImage)}
                alt={t('profile.signatureImage')}
                className="h-16 max-w-[180px] object-contain border border-line rounded-control bg-surface p-2"
              />
            ) : (
              <div className="h-16 w-[180px] border border-dashed border-line rounded-control flex items-center justify-center text-xs text-ink-muted">
                {t('profile.noSignature')}
              </div>
            )}
            <label>
              <span className="inline-flex items-center justify-center rounded-control font-medium transition-colors bg-surface text-ink border border-line hover:border-primary/40 hover:bg-surface-muted text-sm px-3.5 py-2 cursor-pointer min-h-[44px]">
                {signatureUploading ? t('common.loading') : t('profile.uploadSignature')}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleSignatureUpload}
                disabled={signatureUploading}
                className="hidden"
              />
            </label>
          </div>
          {signatureError && <p className="text-sm text-danger mt-3">{signatureError}</p>}
        </Card>

        <Card className="p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label={t('profile.clinicName')} value={form.clinicName} onChange={handleChange('clinicName')} />
            <Input label={t('profile.city')} value={form.city} onChange={handleChange('city')} />
            <Input
              label={t('profile.clinicAddress')}
              value={form.clinicAddress}
              onChange={handleChange('clinicAddress')}
              className="sm:col-span-2"
            />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <Input
            label={t('profile.qualifications')}
            value={form.qualifications}
            onChange={handleChange('qualifications')}
          />
          <Input
            label={t('profile.areasOfExpertise')}
            value={form.areasOfExpertise}
            onChange={handleChange('areasOfExpertise')}
          />
          <Input
            label={t('profile.commonlyTreatedConditions')}
            value={form.commonlyTreatedConditions}
            onChange={handleChange('commonlyTreatedConditions')}
          />
          <Input label={t('profile.languages')} value={form.languages} onChange={handleChange('languages')} />
          <Input
            label={t('profile.professionalAchievements')}
            value={form.professionalAchievements}
            onChange={handleChange('professionalAchievements')}
          />
          <Textarea label={t('profile.bio')} value={form.bio} onChange={handleChange('bio')} rows={4} />
        </Card>

        <Card className="p-6 space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <Input
              label={t('profile.consultationFee')}
              type="number"
              value={form.consultationFee}
              onChange={handleChange('consultationFee')}
            />
            <Input
              label={t('profile.priorityConsultationFee')}
              type="number"
              value={form.priorityConsultationFee}
              onChange={handleChange('priorityConsultationFee')}
            />
            <Input
              label={t('profile.videoConsultationFee')}
              type="number"
              value={form.videoConsultationFee}
              onChange={handleChange('videoConsultationFee')}
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={form.videoConsultationEnabled}
              onChange={handleChange('videoConsultationEnabled')}
              className="w-[18px] h-[18px] rounded accent-primary"
            />
            {t('profile.videoConsultationEnabled')}
          </label>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} size="lg">
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
