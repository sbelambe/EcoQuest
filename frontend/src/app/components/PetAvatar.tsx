import { motion } from "motion/react";
import type { Pet } from "../data/mockData";

interface PetAvatarProps {
  pet: Pet;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

export function PetAvatar({ pet, size = "md", animated = false }: PetAvatarProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-32 h-32",
    lg: "w-48 h-48",
  };

  const petEmojis = {
    raccoon: "🦝",
    turtle: "🐢",
    fox: "🦊",
  };

  const MotionDiv = animated ? motion.div : "div";
  const animationProps = animated
    ? {
        animate: {
          y: [0, -10, 0],
        },
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }
    : {};

  return (
    <MotionDiv
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-green-200 to-green-400 flex items-center justify-center relative shadow-lg`}
      {...animationProps}
    >
      <div className="text-6xl">{petEmojis[pet.type]}</div>
      {pet.mood === "happy" && (
        <div className="absolute -top-2 -right-2 text-2xl">✨</div>
      )}
      {pet.mood === "sad" && (
        <div className="absolute -top-2 -right-2 text-2xl">💧</div>
      )}
      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm border-2 border-green-500">
        {pet.stage}
      </div>
    </MotionDiv>
  );
}
