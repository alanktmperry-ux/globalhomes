import { Rocket, Globe2, Trophy } from 'lucide-react';

const ITEMS = [
  {
    icon: Rocket,
    title: 'Founding-team equity',
    body: 'Meaningful ownership in a category-defining PropTech company. The first 5 hires shape the product, the team, and the culture.',
  },
  {
    icon: Globe2,
    title: 'Multicultural-first product',
    body: 'We serve Mandarin, Vietnamese, Korean, Punjabi, Hindi, Arabic, Filipino, and more — natively, not as an afterthought. Bring your culture to the work.',
  },
  {
    icon: Trophy,
    title: 'Stripe / Linear quality bar',
    body: 'We hold ourselves to the standard of the best SaaS companies in the world. Premium product, restrained design, exceptional craft.',
  },
];

export function WhyListHQ() {
  return (
    <section className="px-4 sm:px-6 py-12 max-w-5xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-light text-center text-foreground mb-10">Why ListHQ</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {ITEMS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border bg-card p-6">
            <Icon className="w-6 h-6 text-primary mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground font-light leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
