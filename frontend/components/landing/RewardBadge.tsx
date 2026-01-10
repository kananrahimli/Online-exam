"use client";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface RewardBadgeProps {
  icon: ReactNode;
  text: string;
  variant: "success" | "accent" | "primary";
  delay?: number;
}

const variantStyles = {
  success: "from-success/10 to-success/5 border-success/30 text-success",
  accent: "from-accent/10 to-accent/5 border-accent/30 text-accent",
  primary: "from-primary/10 to-primary/5 border-primary/30 text-primary",
};

export const RewardBadge = ({
  icon,
  text,
  variant,
  delay = 0,
}: RewardBadgeProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ scale: 1.05 }}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${variantStyles[variant]} border rounded-full font-medium text-sm cursor-pointer`}
    >
      <span className="text-lg">{icon}</span>
      <span>{text}</span>
    </motion.div>
  );
};
