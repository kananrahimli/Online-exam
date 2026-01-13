"use client";
import { motion } from "framer-motion";

interface FloatingShapeProps {
  className?: string;
  size: "sm" | "md" | "lg";
  color: "primary" | "secondary" | "accent";
  delay?: number;
}

const sizeStyles = {
  sm: "w-24 h-24",
  md: "w-40 h-40",
  lg: "w-64 h-64",
};

const colorStyles = {
  primary: "from-primary/20 to-primary/5",
  secondary: "from-secondary/20 to-secondary/5",
  accent: "from-accent/20 to-accent/5",
};

export const FloatingShape = ({
  className = "",
  size,
  color,
  delay = 0,
}: FloatingShapeProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        y: [0, -15, 0],
      }}
      transition={{
        opacity: { duration: 1, delay },
        y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay },
      }}
      className={`absolute rounded-full bg-gradient-to-br ${sizeStyles[size]} ${colorStyles[color]} blur-3xl ${className}`}
    />
  );
};
