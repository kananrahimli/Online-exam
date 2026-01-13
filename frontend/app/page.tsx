"use client";
import { motion } from "framer-motion";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { RewardBadge } from "@/components/landing/RewardBadge";
import { HeroButton } from "@/components/landing/HeroButton";
import { FloatingShape } from "@/components/landing/FloatingShape";
import {
  Sparkles,
  Trophy,
  Zap,
  Target,
  BarChart3,
  Bot,
  ArrowRight,
} from "lucide-react";

const Index = () => {
  return (
    <main className="h-screen w-full overflow-hidden hero-gradient relative">
      {/* Floating Background Shapes */}
      <FloatingShape
        size="lg"
        color="primary"
        className="top-0 right-0 -mr-32 -mt-32"
        delay={0}
      />
      <FloatingShape
        size="md"
        color="secondary"
        className="bottom-0 left-0 -ml-20 -mb-20"
        delay={0.3}
      />
      <FloatingShape
        size="sm"
        color="accent"
        className="top-1/3 right-1/4"
        delay={0.6}
      />

      <div className="relative z-10 h-full w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center py-6">
        {/* Logo & Title */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 btn-gradient rounded-2xl mb-4 shadow-glow"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </motion.div>

          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold gradient-text mb-3 leading-tight">
            Online İmtahan Platforması
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-5">
            AI dəstəklı imtahan sistemi — müəllimlər üçün asan, şagirdlər üçün
            şəffaf və sürətli
          </p>

          {/* Reward Badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <RewardBadge
              icon={<Trophy className="w-4 h-4" />}
              text="Yüksək nəticələr göstər, mükafatlar qazan!"
              variant="success"
              delay={0.2}
            />
            <RewardBadge
              icon="🎁"
              text="İlk 3 yerə pul mükafatı — 10, 7, 3 AZN"
              variant="accent"
              delay={0.3}
            />
            <RewardBadge
              icon={<Zap className="w-4 h-4" />}
              text="Mükafatlarla növbəti imtahanlara pulsuz qoşul"
              variant="primary"
              delay={0.4}
            />
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <HeroButton to="/register" variant="primary" delay={0.5}>
              İndi başla
              <ArrowRight className="w-5 h-5" />
            </HeroButton>
            <HeroButton to="/login" variant="secondary" delay={0.6}>
              Daxil ol
            </HeroButton>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <FeatureCard
            icon={<Target className="w-6 h-6 text-primary-foreground" />}
            title="Asan İstifadə"
            description="3 klikdə AI dəstəyi ilə imtahan yaradın və idarə edin"
            delay={0.2}
          />
          <FeatureCard
            icon={<BarChart3 className="w-6 h-6 text-primary-foreground" />}
            title="Şəffaf Nəticələr"
            description="Nəticələri dərhal görün və liderlər cədvəlində yerinizi bilin"
            delay={0.3}
          />
          <FeatureCard
            icon={<Bot className="w-6 h-6 text-primary-foreground" />}
            title="AI Dəstəyi"
            description="AI texnologiyası ilə sürətli və keyfiyyətli imtahan hazırlayın"
            delay={0.4}
          />
        </div>

        {/* Bottom CTA Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="relative overflow-hidden rounded-3xl btn-gradient p-6 shadow-glow"
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary-foreground/10 rounded-full -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary-foreground/10 rounded-full -ml-16 -mb-16" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h2 className="font-display text-xl md:text-2xl font-bold text-primary-foreground mb-1">
                Hazırsınız? İndi başlayaq! 🚀
              </h2>
              <p className="text-primary-foreground/80 text-sm md:text-base">
                Platformamızı sınayın və imtahan yaratmağın nə qədər asan
                olduğunu görün
              </p>
            </div>
            <motion.a
              href="/register"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 px-8 py-3 bg-card text-primary font-bold rounded-xl shadow-soft hover:shadow-card transition-all"
            >
              Pulsuz qeydiyyatdan keç
            </motion.a>
          </div>
        </motion.div>
      </div>
    </main>
  );
};

export default Index;
