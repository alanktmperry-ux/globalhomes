import { FAQ_ITEMS, type FaqItem } from '@/data/faq';

const SEARCH_RESULT_LIMIT = 8;

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'can',
  'do',
  'for',
  'how',
  'i',
  'is',
  'my',
  'of',
  'the',
  'to',
  'what',
]);

const SYNONYM_GROUPS = [
  ['rent', 'rental', 'rentals', 'renter', 'renters', 'tenant', 'tenants', 'tenancy', 'lease', 'leasing', 'bond'],
  ['buy', 'buyer', 'buyers', 'purchase', 'purchasing', 'offer'],
  ['sell', 'seller', 'sellers', 'vendor', 'vendors', 'sale', 'selling'],
  ['auction', 'auctions', 'bid', 'bidding', 'bidder', 'bidders'],
  ['bill', 'billing', 'invoice', 'invoices', 'payment', 'payments', 'subscription'],
] as const;

const CATEGORY_KEYWORDS: Record<FaqItem['category'], string[]> = {
  general: ['account', 'platform', 'overview'],
  agents: ['agent', 'listing', 'publish', 'dashboard'],
  buyers: ['buyer', 'buy', 'purchase', 'offer'],
  renters: ['rent', 'rental', 'tenant', 'tenancy', 'lease', 'bond', 'application'],
  vendors: ['vendor', 'seller', 'selling', 'report'],
  auctions: ['auction', 'bid', 'reserve', 'paddle'],
  billing: ['billing', 'payment', 'invoice', 'subscription'],
  technical: ['browser', 'notifications', 'privacy', 'account'],
};

const RENTAL_INTENT_TERMS: Set<string> = new Set(SYNONYM_GROUPS[0]);

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function stemToken(token: string) {
  if (token.length <= 3) return token;
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith('ers') && token.length > 5) return token.slice(0, -3);
  if (token.endsWith('er') && token.length > 4) return token.slice(0, -2);
  if (token.endsWith('ing') && token.length > 5) return token.slice(0, -3);
  if (token.endsWith('ed') && token.length > 4) return token.slice(0, -2);
  if (token.endsWith('es') && token.length > 4) return token.slice(0, -2);
  if (token.endsWith('s') && token.length > 4) return token.slice(0, -1);
  return token;
}

function tokenizeText(text: string) {
  const normalized = normalizeText(text);
  return normalized ? normalized.split(/\s+/).filter(Boolean) : [];
}

function withStems(tokens: string[]) {
  return Array.from(
    new Set(
      tokens.flatMap((token) => {
        const stem = stemToken(token);
        return stem === token ? [token] : [token, stem];
      }),
    ),
  );
}

function expandTokens(tokens: string[]) {
  const expanded = new Set(withStems(tokens));

  for (const token of tokens) {
    const stem = stemToken(token);

    for (const group of SYNONYM_GROUPS) {
      if (group.some((term) => term === token || stemToken(term) === stem)) {
        for (const term of group) {
          expanded.add(term);
          expanded.add(stemToken(term));
        }
      }
    }
  }

  return Array.from(expanded);
}

type FaqSearchIndex = {
  item: FaqItem;
  questionText: string;
  answerText: string;
  tagsText: string;
  questionTokens: Set<string>;
  answerTokens: Set<string>;
  tagTokens: Set<string>;
  categoryTokens: Set<string>;
  allRawTokens: string[];
};

function createTokenSet(tokens: string[]) {
  return new Set(withStems(tokens));
}

const FAQ_SEARCH_INDEX: FaqSearchIndex[] = FAQ_ITEMS.map((item) => {
  const questionText = normalizeText(item.question);
  const answerText = normalizeText(item.answer);
  const tagsText = normalizeText(item.tags.join(' '));
  const questionTokens = tokenizeText(item.question);
  const answerTokens = tokenizeText(item.answer);
  const tagTokens = tokenizeText(item.tags.join(' '));
  const categoryTokens = CATEGORY_KEYWORDS[item.category];

  return {
    item,
    questionText,
    answerText,
    tagsText,
    questionTokens: createTokenSet(questionTokens),
    answerTokens: createTokenSet(answerTokens),
    tagTokens: createTokenSet(tagTokens),
    categoryTokens: createTokenSet(categoryTokens),
    allRawTokens: Array.from(new Set([...questionTokens, ...answerTokens, ...tagTokens, ...categoryTokens])),
  };
});

function countExactTokenMatches(queryTokens: string[], tokens: Set<string>) {
  return queryTokens.reduce((count, token) => count + (tokens.has(token) ? 1 : 0), 0);
}

function countPrefixMatches(queryTokens: string[], tokens: string[]) {
  return queryTokens.reduce((count, token) => {
    if (token.length < 3) return count;
    const matched = tokens.some((candidate) => candidate.startsWith(token) || token.startsWith(candidate));
    return count + (matched ? 1 : 0);
  }, 0);
}

export function getFaqMatches(query: string, limit = SEARCH_RESULT_LIMIT) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  const rawQueryTokens = tokenizeText(query);
  const meaningfulTokens = rawQueryTokens.filter((token) => !STOP_WORDS.has(token));
  const baseTokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawQueryTokens;
  if (baseTokens.length === 0) return [];

  const exactTokens = withStems(baseTokens);
  const expandedTokens = expandTokens(baseTokens);
  const hasRentalIntent = expandedTokens.some((token) => RENTAL_INTENT_TERMS.has(token));

  return FAQ_SEARCH_INDEX
    .map((entry) => {
      let score = 0;

      if (entry.questionText.includes(normalizedQuery)) score += 28;
      if (entry.tagsText.includes(normalizedQuery)) score += 20;
      if (entry.answerText.includes(normalizedQuery)) score += 12;

      score += countExactTokenMatches(exactTokens, entry.questionTokens) * 12;
      score += countExactTokenMatches(exactTokens, entry.tagTokens) * 10;
      score += countExactTokenMatches(exactTokens, entry.answerTokens) * 7;
      score += countExactTokenMatches(exactTokens, entry.categoryTokens) * 8;

      score += countExactTokenMatches(expandedTokens, entry.questionTokens) * 5;
      score += countExactTokenMatches(expandedTokens, entry.tagTokens) * 4;
      score += countExactTokenMatches(expandedTokens, entry.answerTokens) * 3;
      score += countExactTokenMatches(expandedTokens, entry.categoryTokens) * 3;

      score += countPrefixMatches(baseTokens, entry.allRawTokens) * 3;

      if (hasRentalIntent && entry.item.category === 'renters') score += 16;
      if (hasRentalIntent && entry.item.category === 'agents' && (entry.tagTokens.has('rent') || entry.tagTokens.has('rental') || entry.answerTokens.has('application'))) {
        score += 8;
      }

      return score > 0
        ? {
            item: entry.item,
            score,
            directMatches: countExactTokenMatches(exactTokens, entry.questionTokens) + countExactTokenMatches(exactTokens, entry.tagTokens),
          }
        : null;
    })
    .filter((entry): entry is { item: FaqItem; score: number; directMatches: number } => Boolean(entry))
    .sort((a, b) => b.score - a.score || b.directMatches - a.directMatches || a.item.question.localeCompare(b.item.question))
    .slice(0, limit)
    .map(({ item }) => item);
}
