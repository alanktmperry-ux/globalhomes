import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ComparableSalesList } from '@/features/market/components/ComparableSalesList';
import { SuburbMarketSnapshot } from '@/features/market/components/SuburbMarketSnapshot';
import { PriceTrendChart } from '@/features/market/components/PriceTrendChart';

const SuburbSoldPage = () => {
  const { state, slug } = useParams<{ state: string; slug: string }>();
  const suburb = (slug ?? '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const stateUpper = (state ?? '').toUpperCase();

  return (
    <>
      <Helmet>
        <title>Recently Sold in {suburb} {stateUpper} | Prices & Market Data — ListHQ</title>
        <meta name="description" content={`View recent property sales in ${suburb}, ${stateUpper}. Median prices, days on market, and auction clearance rates.`} />
      </Helmet>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recently Sold in {suburb}, {stateUpper}</h1>
          <p className="text-sm text-muted-foreground mt-1">Sales data, median prices, and market trends</p>
        </div>
        <SuburbMarketSnapshot suburb={suburb} state={stateUpper} />
        <PriceTrendChart suburb={suburb} state={stateUpper} />
        <ComparableSalesList suburb={suburb} state={stateUpper} />
      </div>
    </>
  );
};

export default SuburbSoldPage;
