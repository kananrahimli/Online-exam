"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ReactNode } from "react";

interface HeroButtonProps {
  to: string;
  variant: "primary" | "secondary";
  children: ReactNode;
  delay?: number;
}

export const HeroButton = ({
  to,
  variant,
  children,
  delay = 0,
}: HeroButtonProps) => {
  const baseStyles =
    "px-8 py-4 rounded-2xl font-semibold text-base transition-all duration-300 flex items-center justify-center gap-2";

  const variants = {
    primary:
      "btn-gradient text-primary-foreground hover:opacity-90 hover:scale-105",
    secondary:
      "bg-card border-2 border-primary/20 text-primary hover:border-primary/50 hover:bg-primary/5",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link href={to} className={`${baseStyles} ${variants[variant]}`}>
        {children}
      </Link>
    </motion.div>
  );
};
