import { useState, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { HelpCircle, X, Search, ArrowRight } from 'lucide-react';
import { FAQ_ITEMS } from '@/data/faq';
import { HelpSearch } from './HelpSearch';

function getContextLinks(pathname: string) {
  if (pathname.startsWith('/dashboard/listings') || pathname.startsWith('/dashboard/cma')) {
    return FAQ_ITEMS.filter((i) => i.category === 'agents').slice(0, 4);
  }
  if (pathname.startsWith('/property/')) {
    return FAQ_ITEMS.filter((i) => ['buyers', 'auctions'].includes(i.category)).slice(0, 4);
  }
  return FAQ_ITEMS.filter((i) => i.category === 'general').slice(0, 4);
}

export function HelpWidget() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const contextLinks = useMemo(() => getContextLinks(pathname), [pathname]);

  if (pathname.startsWith('/help')) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 md:bottom-6 right-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
          aria-label="Help"
        >
          <HelpCircle size={22} />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 md:bottom-6 right-4 z-50 w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
            <h3 className="text-sm font-semibold text-foreground">Help</h3>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>

          <div className="p-3">
            <HelpSearch placeholder="Search help..." className="mb-3" />

            <div className="space-y-1">
              {contextLinks.map((item) => (
                <Link
                  key={item.id}
                  to={`/help/faq#faq-${item.id}`}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors"
                >
                  {item.question}
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t border-border p-3 flex gap-2">
            <Link
              to="/help"
              onClick={() => setOpen(false)}
              className="flex-1 text-center text-xs font-medium text-primary hover:underline py-1.5"
            >
              View all help
            </Link>
            <Link
              to="/help/contact"
              onClick={() => setOpen(false)}
              className="flex-1 text-center text-xs font-medium text-muted-foreground hover:text-foreground py-1.5"
            >
              Contact support
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
