import { Star, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DashboardHeader from './DashboardHeader';

const ReviewsPage = () => {
  // Placeholder — reviews will come from a future reviews table
  const mockReviews = [
    { id: '1', author: 'Sarah M.', rating: 5, text: 'Excellent agent, helped us find our dream home quickly.', date: '2026-02-15', replied: true },
    { id: '2', author: 'James P.', rating: 4, text: 'Very professional and responsive. Great communication throughout.', date: '2026-01-28', replied: false },
    { id: '3', author: 'Lisa K.', rating: 5, text: 'Highly recommend! Made the buying process stress-free.', date: '2026-01-10', replied: true },
  ];

  const avgRating = mockReviews.reduce((s, r) => s + r.rating, 0) / mockReviews.length;

  return (
    <div>
      <DashboardHeader title="Reviews" subtitle="Manage client reviews and feedback" />
      <div className="p-4 sm:p-6 max-w-3xl space-y-6">
        {/* Summary */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">{avgRating.toFixed(1)}</p>
            <div className="flex gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={14} className={i <= Math.round(avgRating) ? 'text-warning fill-warning' : 'text-muted-foreground'} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{mockReviews.length} reviews</p>
          </div>
          <div className="flex-1">
            <Button variant="outline" size="sm"><MessageSquare size={14} className="mr-2" /> Request Review</Button>
          </div>
        </div>

        {/* Reviews */}
        <div className="space-y-3">
          {mockReviews.map(r => (
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
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} size={12} className={i <= r.rating ? 'text-warning fill-warning' : 'text-muted-foreground'} />
                    ))}
                  </div>
                  {r.replied && <Badge variant="secondary" className="text-[10px]">Replied</Badge>}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{r.text}</p>
              {!r.replied && <Button variant="outline" size="sm" className="text-xs">Reply</Button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReviewsPage;
