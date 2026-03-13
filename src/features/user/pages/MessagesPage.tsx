import { MessageCircle } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { useI18n } from '@/lib/i18n';

const MessagesPage = () => {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="font-display text-xl font-bold text-foreground">{t('nav.messages')}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <MessageCircle size={40} strokeWidth={1.2} className="mb-3" />
          <p className="text-sm">No messages yet</p>
          <p className="text-xs mt-1">Contact an agent to start a conversation</p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default MessagesPage;
