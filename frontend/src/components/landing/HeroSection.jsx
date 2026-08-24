import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { fetchPublicDoctorProfile } from '../../services/doctorService';
import Button from '../ui/Button';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import Reveal from './Reveal';
import FloatOnClick from './FloatOnClick';
import { CheckCircleIcon } from '../layout/icons';
import doctorHeroPhoto from '../../assets/images/doctor-hero.jpg';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

// No background color/gradient/glow lives in this file on purpose — the page's single
// background is owned by Landing.jsx. This component only renders content: text and the
// photo slot.
export default function HeroSection() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const consultPath = isAuthenticated ? '/patient/consultations/new' : '/register/patient';

  const [doctor, setDoctor] = useState(null);
  useEffect(() => {
    fetchPublicDoctorProfile().then(setDoctor).catch(() => {});
  }, []);

  return (
    <section className="relative">
      <ResponsiveContainer className="py-14 sm:py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            {/* Photo slot — the doctor's uploaded profile photo takes priority once set;
                falls back to the current photo on file otherwise. Either way, the tint +
                vignette layers are what give it the golden-hour read, so swapping the
                image later needs no other change. */}
            <FloatOnClick rounded="rounded-md" className="relative aspect-[4/5] overflow-hidden border border-line block">
              <img
                src={doctor?.profilePhoto || doctorHeroPhoto}
                alt={doctor?.fullName || t('landing.doctor.eyebrow')}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(165deg, rgba(233,201,120,0.22) 0%, rgba(10,8,6,0.1) 45%, rgba(8,6,4,0.6) 100%)',
                  mixBlendMode: 'multiply',
                }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: 'radial-gradient(ellipse 90% 80% at 50% 40%, transparent 55%, rgba(6,5,3,0.5) 100%)' }}
              />
              {(doctor?.clinicName || doctor?.city) && (
                <p className="absolute left-5 bottom-5 text-[11px] uppercase tracking-[0.14em] text-ink/70">
                  {[doctor.clinicName, doctor.city].filter(Boolean).join(' · ')}
                </p>
              )}
            </FloatOnClick>
          </Reveal>

          <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
            <motion.span
              variants={itemVariants}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary-light"
            >
              <span className="w-6 h-px bg-primary" aria-hidden="true" />
              {t('landing.hero.badge')}
            </motion.span>
            <motion.h1
              variants={itemVariants}
              className="mt-6 font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl text-ink tracking-tight leading-[0.98]"
            >
              {t('landing.hero.headline')}{' '}
              <span className="bg-gradient-to-r from-primary-light via-primary to-[#8A6A2E] bg-clip-text text-transparent">
                {t('landing.hero.headlineAccent')}
              </span>
              ,<br />
              {t('landing.hero.headlineEnd')}
            </motion.h1>
            <motion.p variants={itemVariants} className="mt-6 text-ink-muted text-lg sm:text-xl leading-relaxed max-w-lg">
              {t('landing.hero.subcopy')}
            </motion.p>

            <motion.div variants={itemVariants} className="mt-8">
              <Link to={consultPath}>
                <Button size="lg">{t('landing.hero.primaryCta')}</Button>
              </Link>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2">
              {[t('landing.hero.trust1'), t('landing.hero.trust2'), t('landing.hero.trust3')].map((label) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                  <CheckCircleIcon className="w-4 h-4 text-primary" />
                  {label}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </ResponsiveContainer>
    </section>
  );
}
