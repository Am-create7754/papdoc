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
import FloatingMotif from './decor/FloatingMotif';
import { CapsuleMotif, MoleculeMotif } from './decor/MedicalMotifIcons';
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
      <FloatingMotif
        icon={CapsuleMotif}
        className="hidden lg:block top-10 right-[6%]"
        size="w-9 h-9"
        tone="text-primary-light/25"
        duration={11}
      />
      <FloatingMotif
        icon={MoleculeMotif}
        className="hidden sm:block bottom-8 left-[3%]"
        size="w-7 h-7"
        tone="text-primary/20"
        duration={13}
        delay={400}
        driftY={10}
      />
      <ResponsiveContainer className="pt-4 pb-12 sm:py-16 lg:py-28">
        {/* Below lg the photo and copy read as one unit: a shorter photo that fades into the page,
            with the headline rising onto that fade. lg+ keeps the side-by-side layout. */}
        <div className="grid lg:grid-cols-2 gap-0 lg:gap-16 items-center">
          <Reveal>
            {/* Photo slot — the doctor's uploaded profile photo takes priority once set;
                falls back to the current photo on file otherwise. Either way, the tint +
                vignette layers are what give it the golden-hour read, so swapping the
                image later needs no other change. */}
            <FloatOnClick
              rounded="rounded-[28px] lg:rounded-md"
              className="relative aspect-square sm:aspect-[4/3] lg:aspect-[4/5] overflow-hidden border border-line block"
            >
              <img
                src={doctor?.profilePhoto || doctorHeroPhoto}
                alt={doctor?.fullName || t('landing.doctor.eyebrow')}
                className="absolute inset-0 w-full h-full object-cover object-[65%_8%] lg:object-center"
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
              <div
                aria-hidden="true"
                className="lg:hidden absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-canvas via-canvas/70 to-transparent"
              />
              {(doctor?.clinicName || doctor?.city) && (
                <p className="absolute left-4 top-4 lg:top-auto lg:left-5 lg:bottom-5 rounded-full bg-black/45 px-3 py-1 backdrop-blur-sm lg:bg-transparent lg:p-0 lg:backdrop-blur-none lg:rounded-none text-[10px] lg:text-[11px] uppercase tracking-[0.14em] text-ink/80 lg:text-ink/70">
                  {[doctor.clinicName, doctor.city].filter(Boolean).join(' · ')}
                </p>
              )}
            </FloatOnClick>
          </Reveal>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="relative z-10 -mt-14 sm:-mt-20 px-1 lg:mt-0 lg:px-0"
          >
            <motion.span
              variants={itemVariants}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary-light"
            >
              <span className="w-6 h-px bg-primary" aria-hidden="true" />
              {t('landing.hero.badge')}
            </motion.span>
            <motion.h1
              variants={itemVariants}
              className="mt-4 lg:mt-6 font-display font-extrabold text-[clamp(2.1rem,9.6vw,3.75rem)] lg:text-[clamp(2.75rem,4.4vw,3.6rem)] text-ink tracking-tight leading-[1.02] lg:leading-[0.98]"
            >
              {t('landing.hero.headline')}{' '}
              <span className="bg-gradient-to-r from-primary-light via-primary to-[#8A6A2E] bg-clip-text text-transparent">
                {t('landing.hero.headlineAccent')}
              </span>
              ,<br />
              {t('landing.hero.headlineEnd')}
            </motion.h1>
            <motion.p variants={itemVariants} className="mt-4 lg:mt-6 text-ink-muted text-base sm:text-lg lg:text-xl leading-relaxed max-w-lg">
              {t('landing.hero.subcopy')}
            </motion.p>

            <motion.div variants={itemVariants} className="mt-6 lg:mt-8">
              <Link to={consultPath} className="block sm:inline-block">
                <Button size="lg" fullWidth className="sm:w-auto">{t('landing.hero.primaryCta')}</Button>
              </Link>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-6 lg:mt-9 flex flex-wrap items-center gap-x-5 gap-y-2">
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
