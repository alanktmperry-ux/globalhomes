import { useEffect, useState } from 'react';

const MESSAGES: Array<{ name: string; rest: string }> = [
  { name: 'Mei',    rest: 'just enquired in Mandarin on a Box Hill listing · 2 min ago' },
  { name: 'Wei',    rest: 'just unlocked a Halo in Auburn · 4 min ago' },
  { name: 'Tuan',   rest: 'matched with a 3-bed in Cabramatta · 6 min ago' },
  { name: 'Priya',  rest: 'viewed 12 listings in Parramatta · 8 min ago' },
  { name: 'Marco',  rest: 'published a listing in every buyer language · 12 min ago' },
  { name: 'Sofia',  rest: 'generated a CMA in 24 seconds · 15 min ago' },
];

export default function LiveActivityTicker() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, 200);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const m = MESSAGES[idx];

  return (
    <div
      className="max-w-[1280px] mx-auto px-8 pb-12 flex items-center justify-center gap-3 opacity-0 animate-fade-up"
      style={{ animationDelay: '0.75s' }}
    >
      <span className="relative w-2 h-2 rounded-full bg-[#34D399]">
        <span className="absolute inset-0 rounded-full bg-[#34D399] animate-ping-soft" />
      </span>
      <span
        className="text-[13px] text-[#6a6a6a] font-medium transition-opacity duration-200 whitespace-nowrap overflow-hidden text-ellipsis"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <b className="font-bold text-[#1a1a1a]">{m.name}</b> {m.rest}
      </span>
    </div>
  );
}
