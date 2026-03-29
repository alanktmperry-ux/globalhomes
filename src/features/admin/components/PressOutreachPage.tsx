import { useState } from 'react';
import { ExternalLink, Send, CheckCircle2, Clock, XCircle, FileText, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type ContactStatus = 'not_contacted' | 'contacted' | 'responded' | 'no_response';

interface Publication {
  name: string;
  url: string;
  journalist: string;
  email: string;
  status: ContactStatus;
  notes: string;
}

const initialPublications: Publication[] = [
  { name: 'The Real Estate Conversation', url: 'therealestateconversation.com.au', journalist: 'Editor', email: 'editor@therealestateconversation.com.au', status: 'not_contacted', notes: '' },
  { name: 'Elite Agent Magazine', url: 'eliteagent.com', journalist: 'Editor', email: 'editor@eliteagent.com', status: 'not_contacted', notes: '' },
  { name: 'REB Online', url: 'reb.com.au', journalist: 'News Desk', email: 'news@reb.com.au', status: 'not_contacted', notes: '' },
  { name: 'Property Observer', url: 'propertyobserver.com.au', journalist: 'Editor', email: 'editor@propertyobserver.com.au', status: 'not_contacted', notes: '' },
  { name: 'Australian Financial Review', url: 'afr.com', journalist: 'Technology Editor', email: 'tech@afr.com.au', status: 'not_contacted', notes: 'Tech/Property section' },
  { name: 'Smart Property Investment', url: 'smartpropertyinvestment.com.au', journalist: 'Editor', email: 'editor@smartpropertyinvestment.com.au', status: 'not_contacted', notes: '' },
  { name: 'REIQ Journal', url: 'reiq.com', journalist: 'Media', email: 'media@reiq.com', status: 'not_contacted', notes: 'Queensland focus' },
  { name: 'Domain', url: 'domain.com.au', journalist: 'News Desk', email: 'news@domain.com.au', status: 'not_contacted', notes: 'News section' },
  { name: 'SMH Business', url: 'smh.com.au', journalist: 'Property Reporter', email: 'property@smh.com.au', status: 'not_contacted', notes: '' },
  { name: 'News.com.au', url: 'news.com.au', journalist: 'Property Editor', email: 'property@news.com.au', status: 'not_contacted', notes: '' },
  { name: 'PropTech Association Australia', url: 'proptechassociation.com.au', journalist: 'Partnerships', email: 'hello@proptechassociation.com.au', status: 'not_contacted', notes: 'Industry body' },
  { name: 'Real Estate Business', url: 'realestatebusiness.com.au', journalist: 'Editor', email: 'editor@realestatebusiness.com.au', status: 'not_contacted', notes: '' },
];

const statusConfig: Record<ContactStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  not_contacted: { label: 'Not Contacted', variant: 'outline', icon: Clock },
  contacted: { label: 'Contacted', variant: 'secondary', icon: Send },
  responded: { label: 'Responded', variant: 'default', icon: CheckCircle2 },
  no_response: { label: 'No Response', variant: 'destructive', icon: XCircle },
};

const pressRelease = `FOR IMMEDIATE RELEASE

Australian PropTech ListHQ Launches AI Platform Giving Real Estate Agents an Unfair Advantage

[City, Date] — ListHQ, a new Australian-built property technology platform, today announced its public launch, bringing four purpose-built AI tools to real estate agents across Australia.

Key highlights:
• 4 AI builds: Seller Likelihood Score, AI Buyer Concierge, AI Offer Generator, and Lead Marketplace
• Built specifically for licensed Australian real estate agents
• Fully compliant with Australian Privacy Act 1988 and state trust accounting regulations
• Voice-powered buyer search in 24 languages for international investor access

"Australian agents spend 60% of their time on tasks that AI can handle," said [Founder Name], founder of ListHQ. "We've built four AI tools that give agents back their most valuable resource — time."

The platform targets a 10,000-agent subscriber base within 5 years, with a founding cohort of 100 agents receiving lifetime discounted pricing.

About ListHQ:
ListHQ is an AI-powered property platform purpose-built for Australian real estate agents. It combines voice search technology, predictive seller scoring, automated offer generation, and a buyer lead marketplace into a single subscription platform.

Media contact:
[Name]
[Email]
[Phone]
listhq.com.au`;

export default function PressOutreachPage() {
  const [publications, setPublications] = useState(initialPublications);
  const [showRelease, setShowRelease] = useState(false);

  const cycleStatus = (index: number) => {
    const statuses: ContactStatus[] = ['not_contacted', 'contacted', 'responded', 'no_response'];
    setPublications(prev => prev.map((p, i) => {
      if (i !== index) return p;
      const currentIdx = statuses.indexOf(p.status);
      return { ...p, status: statuses[(currentIdx + 1) % statuses.length] };
    }));
  };

  const contacted = publications.filter(p => p.status !== 'not_contacted').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">PR & Media Outreach</h2>
          <p className="text-sm text-muted-foreground">{contacted}/{publications.length} publications contacted</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowRelease(!showRelease)}>
            <FileText size={14} className="mr-1" />
            {showRelease ? 'Hide' : 'View'} Press Release
          </Button>
        </div>
      </div>

      {showRelease && (
        <div className="relative bg-card border border-border rounded-xl p-6">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 right-3"
            onClick={() => { navigator.clipboard.writeText(pressRelease); toast.success('Press release copied!'); }}
          >
            <Copy size={14} className="mr-1" /> Copy
          </Button>
          <pre className="text-sm text-foreground whitespace-pre-wrap font-body leading-relaxed">{pressRelease}</pre>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left p-3 font-semibold">Publication</th>
                <th className="text-left p-3 font-semibold">Contact</th>
                <th className="text-left p-3 font-semibold">Email</th>
                <th className="text-left p-3 font-semibold">Status</th>
                <th className="text-left p-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {publications.map((pub, i) => {
                const sc = statusConfig[pub.status];
                return (
                  <tr key={pub.name} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="p-3">
                      <a href={`https://${pub.url}`} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary flex items-center gap-1">
                        {pub.name} <ExternalLink size={12} className="text-muted-foreground" />
                      </a>
                    </td>
                    <td className="p-3 text-muted-foreground">{pub.journalist}</td>
                    <td className="p-3">
                      <a href={`mailto:${pub.email}`} className="text-primary hover:underline text-xs">{pub.email}</a>
                    </td>
                    <td className="p-3">
                      <button onClick={() => cycleStatus(i)}>
                        <Badge variant={sc.variant} className="cursor-pointer gap-1">
                          <sc.icon size={12} /> {sc.label}
                        </Badge>
                      </button>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{pub.notes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
