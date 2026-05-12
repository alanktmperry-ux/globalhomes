import { MessageCircle } from 'lucide-react';
import { useConversations } from '@/features/messaging/hooks/useConversations';

interface Props {
  userId: string;
  onClick: () => void;
  itemClassName: string;
  labelClassName: string;
  iconStroke: number;
}

// Split out so the messaging chunk only loads for signed-in users — keeps it
// out of the cold-paint critical path of the public homepage.
export default function BottomNavMessagesTab({
  userId,
  onClick,
  itemClassName,
  labelClassName,
  iconStroke,
}: Props) {
  const { totalUnread } = useConversations(userId);
  return (
    <button onClick={onClick} className={itemClassName}>
      <div className="relative">
        <MessageCircle size={22} strokeWidth={iconStroke} />
        {totalUnread > 0 && (
          <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-red-500 border-[1.5px] border-white text-[9px] font-bold text-white flex items-center justify-center">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </div>
      <span className={labelClassName}>Messages</span>
    </button>
  );
}
