import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Copy, Mail, Instagram, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Props {
  title: string;
  onDone: () => void;
}

const ListingSuccess = ({ title, onDone }: Props) => {
  const { toast } = useToast();
  const [confetti, setConfetti] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setConfetti(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(`https://worldpropertypulse.com/listing/${Date.now()}`);
    toast({ title: 'Link copied!' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12 relative"
    >
      {/* Confetti particles */}
      {confetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--destructive))', '#FFD700', '#FF69B4'][i % 5],
                left: `${Math.random() * 100}%`,
                top: '-10px',
              }}
              animate={{
                y: [0, 400 + Math.random() * 200],
                x: [0, (Math.random() - 0.5) * 200],
                rotate: [0, Math.random() * 720],
                opacity: [1, 0],
              }}
              transition={{
                duration: 2 + Math.random(),
                delay: Math.random() * 0.5,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-5"
      >
        <CheckCircle2 size={40} className="text-success" />
      </motion.div>

      <h2 className="font-display text-2xl font-extrabold mb-2 flex items-center justify-center gap-2">
        Listing Live! <PartyPopper size={24} className="text-primary" />
      </h2>
      <p className="text-muted-foreground text-sm mb-2">{title}</p>
      <p className="text-sm text-success font-semibold mb-8">
        3 qualified buyers have been notified
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-8">
        <Button variant="outline" size="sm" onClick={copyLink} className="gap-1.5 text-xs">
          <Copy size={14} /> Copy Link
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Mail size={14} /> Email to Database
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Instagram size={14} /> Instagram Stories
        </Button>
      </div>

      <Button size="sm" onClick={onDone}>Back to Dashboard</Button>
    </motion.div>
  );
};

export default ListingSuccess;
