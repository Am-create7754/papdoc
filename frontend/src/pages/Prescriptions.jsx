import { useTranslation } from 'react-i18next';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import { PillIcon } from '../components/layout/icons';

export default function Prescriptions() {
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader title={t('prescriptions.title')} backTo="/patient" backLabel={t('myConsultations.backHome')} />
      <EmptyState
        icon={<PillIcon className="w-6 h-6" />}
        title={t('prescriptions.title')}
        description={t('prescriptions.empty')}
      />
    </div>
  );
}
