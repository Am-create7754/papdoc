import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchMyPatientProfile, updateMyPatientProfile } from '../services/patientService';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import { PageLoader } from '../components/ui/Loader';
import { AlertIcon, PillIcon, UserIcon } from '../components/layout/icons';

function SectionTitle({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <span className="flex items-center justify-center w-10 h-10 rounded-2xl bg-primary/15 text-primary-light shrink-0">
        <Icon className="w-5 h-5" />
      </span>
      <div>
        <h2 className="font-display font-bold text-ink">{title}</h2>
        {desc && <p className="text-sm text-ink-muted mt-0.5">{desc}</p>}
      </div>
    </div>
  );
}

function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

const ARRAY_FIELDS = ['allergies', 'existingMedicalConditions', 'currentMedications'];

function toFormState(profile) {
  return {
    name: profile.name || '',
    phone: profile.phone || '',
    dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
    gender: profile.gender || '',
    location: profile.location || '',
    bloodGroup: profile.bloodGroup || '',
    allergies: (profile.allergies || []).join(', '),
    existingMedicalConditions: (profile.existingMedicalConditions || []).join(', '),
    currentMedications: (profile.currentMedications || []).join(', '),
    emergencyContactName: profile.emergencyContact?.name || '',
    emergencyContactPhone: profile.emergencyContact?.phone || '',
    emergencyContactRelation: profile.emergencyContact?.relation || '',
  };
}

function toPayload(form) {
  const payload = {};
  if (form.name) payload.name = form.name;
  if (form.phone) payload.phone = form.phone;
  if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
  if (form.gender) payload.gender = form.gender;
  if (form.location) payload.location = form.location;
  if (form.bloodGroup) payload.bloodGroup = form.bloodGroup;
  ARRAY_FIELDS.forEach((f) => {
    payload[f] = form[f]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  });
  payload.emergencyContact = {
    name: form.emergencyContactName,
    phone: form.emergencyContactPhone,
    relation: form.emergencyContactRelation,
  };
  return payload;
}

export default function PatientProfile() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const profile = await fetchMyPatientProfile();
        setEmail(profile.email);
        setForm(toFormState(profile));
      } catch (err) {
        setError(err.response?.data?.message || t('profile.loadError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const updated = await updateMyPatientProfile(toPayload(form));
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
      <PageHeader title={t('profile.patientTitle')} backTo="/patient" backLabel={t('profile.back')} />

      {error && (
        <p className="mb-4 text-sm text-danger bg-danger-bg border border-danger/20 rounded-control p-3">{error}</p>
      )}
      {success && (
        <p className="mb-4 text-sm text-success bg-success-bg border border-success/20 rounded-control p-3">
          {success}
        </p>
      )}

      <section className="relative overflow-hidden rounded-[28px] border border-primary/25 bg-gradient-to-br from-primary/20 via-surface to-surface p-6 sm:p-8 mb-6">
        <div aria-hidden="true" className="absolute -top-20 -right-10 w-64 h-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <span className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-light to-primary text-canvas font-display font-bold text-3xl shadow-pop shrink-0">
            {initialsOf(form.name)}
          </span>
          <div className="min-w-0">
            <p className="font-display font-bold text-2xl text-ink truncate">{form.name}</p>
            <p className="text-sm text-ink-muted truncate">{email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[form.bloodGroup, form.gender && t(`profile.${form.gender}`), form.location, form.phone]
                .filter(Boolean)
                .map((chip) => (
                  <span key={chip} className="rounded-full border border-line bg-canvas/50 px-3 py-1 text-xs font-medium text-ink">
                    {chip}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="p-6">
          <SectionTitle icon={UserIcon} title={t('profile.sectionPersonal')} desc={t('profile.sectionPersonalDesc')} />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label={t('profile.email')} value={email} disabled className="opacity-60" />
            <Input label={t('profile.name')} value={form.name} onChange={handleChange('name')} />
            <Input label={t('profile.phone')} value={form.phone} onChange={handleChange('phone')} />
            <Input
              label={t('profile.dateOfBirth')}
              type="date"
              value={form.dateOfBirth}
              onChange={handleChange('dateOfBirth')}
            />
            <Select label={t('profile.gender')} value={form.gender} onChange={handleChange('gender')}>
              <option value="">{t('common.select')}</option>
              <option value="male">{t('profile.male')}</option>
              <option value="female">{t('profile.female')}</option>
              <option value="other">{t('profile.other')}</option>
            </Select>
            <Input label={t('profile.location')} value={form.location} onChange={handleChange('location')} />
            <Select label={t('profile.bloodGroup')} value={form.bloodGroup} onChange={handleChange('bloodGroup')}>
              <option value="">{t('common.select')}</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <SectionTitle icon={PillIcon} title={t('profile.sectionMedical')} desc={t('profile.sectionMedicalDesc')} />
          <Input label={t('profile.allergies')} value={form.allergies} onChange={handleChange('allergies')} />
          <Input
            label={t('profile.existingMedicalConditions')}
            value={form.existingMedicalConditions}
            onChange={handleChange('existingMedicalConditions')}
          />
          <Input
            label={t('profile.currentMedications')}
            value={form.currentMedications}
            onChange={handleChange('currentMedications')}
          />
        </Card>

        <Card className="p-6">
          <SectionTitle icon={AlertIcon} title={t('profile.emergencyContactSection')} desc={t('profile.sectionEmergencyDesc')} />
          <div className="grid sm:grid-cols-3 gap-4">
            <Input
              label={t('profile.emergencyContactName')}
              value={form.emergencyContactName}
              onChange={handleChange('emergencyContactName')}
            />
            <Input
              label={t('profile.emergencyContactPhone')}
              value={form.emergencyContactPhone}
              onChange={handleChange('emergencyContactPhone')}
            />
            <Input
              label={t('profile.emergencyContactRelation')}
              value={form.emergencyContactRelation}
              onChange={handleChange('emergencyContactRelation')}
            />
          </div>
        </Card>

        <div className="sticky bottom-24 lg:bottom-4 z-20 flex justify-end">
          <Button type="submit" disabled={saving} size="lg" className="shadow-pop">
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
