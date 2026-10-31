import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGps } from '../components/LocationSheet';
import { SITE_PAGES, SiteFooter, SiteNavbar } from '../components/site';
import { CtaBand, EcosystemBand, FamilyBand, FaqBand, MerchantsBand, NetworkBand, SmartBand, SupportBand, WhyBand } from '../components/home/Business';
import { AppBand, AreaCheck, Categories } from '../components/home/Discover';
import { CartButton, NowBar, NowHero } from '../components/home/Hero';
import { GiftsBand, LocalBand, PharmacyBand, SpecialtyBand } from '../components/home/Kinds';
import { AroundProvider, scrollToId } from '../components/home/kit';
import { FoodNear, RushBand, ShopProducts, StoresNear } from '../components/home/Nearby';
import { HowBand, OffersBand, SearchBand, TrackBand } from '../components/home/Order';
import { useI18n } from '../lib/i18n';
import { useDeliverTo } from '../lib/location';

// Home: the Delivez Now page (the public page before and after a location is chosen), section by section as in the design.
export default function Landing() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const at = useDeliverTo((s) => s.at);
  const [message, setMessage] = useState('');
  // A category picked before the location is known (?v=…) opens once the location is set.
  const want = SITE_PAGES.find((v) => v === params.get('v')) ?? null;
  const next = want ? `/shops?v=${want}` : '/shops';
  const go = () => navigate(next);
  const gps = useGps(go, setMessage);
  const mapHref = `/addresses/new?next=${encodeURIComponent(next)}`;

  useEffect(() => {
    document.title = 'Delivez Now — your city, your stores, delivered';
  }, []);

  function askLocation() {
    if (at) return go();
    setMessage(t('lc.land.pickFirst'));
    scrollToId('hero-location');
  }
  useEffect(() => {
    if (want) askLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [want]);

  return (
    <div className="dz-now flex min-h-screen flex-col">
      <SiteNavbar onCategory={() => askLocation()} />
      <AroundProvider>
        <main className="flex-1">
          <NowHero onGps={gps} onGo={go} mapHref={mapHref} message={message} askLocation={askLocation} />
          <NowBar />
          <AppBand />
          <AreaCheck onStart={askLocation} />
          <Categories />
          <StoresNear onStart={askLocation} />
          <RushBand />
          <ShopProducts />
          <FoodNear />
          <PharmacyBand />
          <LocalBand />
          <GiftsBand />
          <SpecialtyBand />
          <HowBand />
          <SearchBand />
          <OffersBand />
          <TrackBand />
          <MerchantsBand />
          <NetworkBand />
          <SmartBand />
          <EcosystemBand onStart={askLocation} />
          <WhyBand />
          <SupportBand />
          <FaqBand />
          <CtaBand onStart={askLocation} />
          <FamilyBand />
        </main>
        <CartButton />
      </AroundProvider>
      <SiteFooter />
    </div>
  );
}
