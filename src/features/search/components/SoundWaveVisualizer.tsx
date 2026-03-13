import { motion } from 'framer-motion';

interface SoundWaveVisualizerProps {
  isActive: boolean;
}

export function SoundWaveVisualizer({ isActive }: SoundWaveVisualizerProps) {
  const bars = 5;

  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-primary"
          animate={
            isActive
              ? {
                  height: [8, 24 + Math.random() * 8, 12, 28 + Math.random() * 4, 8],
                }
              : { height: 8 }
          }
          transition={
            isActive
              ? {
                  duration: 0.8 + i * 0.1,
                  repeat: Infinity,
                  repeatType: 'mirror',
                  ease: 'easeInOut',
                  delay: i * 0.1,
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}
