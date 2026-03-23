import { Star, MessageSquare, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DashboardHeader from './DashboardHeader';

const ReviewsPage = () => {
  // No reviews yet — coming in a future release
  const reviews: any[] = [];

  return (
    <div>
      <DashboardHeader title="Reviews" subtitle="Manage client reviews and feedback" />
      <div className="p-4 sm:p-6 max-w-3xl space-y-6">

        {/* Request review CTA */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Build your reputation
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ask satisfied clients to leave a review — it appears here and on your public profile.
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0">
            <MessageSquare size={14} className="mr-2" /> Request Review
          </Button>
        </div>

        {/* Empty state */}
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Inbox size={24} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              No reviews yet
            </p>
            <p className="text-xs text-muted-foreground max-w-[220px]">
              Reviews from your clients will appear here once the reviews feature launches.
            </p>
            <div className="flex gap-0.5 mt-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={18} className="text-border" />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r: any) => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                      {r.author[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.author}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(r.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} size={12} className={i <= r.rating ? 'text-warning fill-warning' : 'text-muted-foreground'} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{r.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsPage;
