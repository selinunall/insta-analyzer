import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import {
  AdEventType,
  BannerAd,
  BannerAdSize,
  RewardedAd,
  RewardedAdEventType
} from 'react-native-google-mobile-ads';

const adUnitIdBanner = Platform.select({
  ios: "ca-app-pub-9138768479487019/3436515840",
  android: "ca-app-pub-9138768479487019/4609996719",
});

const adUnitIdRewarded = Platform.select({
  ios: "ca-app-pub-9138768479487019/8497270832",
  android: "ca-app-pub-9138768479487019/3492479879",
});

// Banner component
export const AppBannerAd: React.FC = () => {
  if (!adUnitIdBanner) return null;

  return (
    <View style={{ alignItems: 'center', marginVertical: 10 }}>
      <BannerAd
        unitId={adUnitIdBanner}
        size={BannerAdSize.BANNER}
        onAdFailedToLoad={(error) => console.error('Banner yüklenemedi:', error)}
        onAdLoaded={() => console.log('Banner yüklendi')}
      />
    </View>
  );
};

// Helper: try get event constant from RewardedAdEventType then AdEventType
const getEventConst = (name: string): string | undefined => {
  // both are `any` cast to avoid TS narrowing errors for older/newer versions
  const r = (RewardedAdEventType as any)?.[name];
  if (typeof r !== 'undefined') return r;
  const a = (AdEventType as any)?.[name];
  if (typeof a !== 'undefined') return a;
  return undefined;
};

export const useAdBasedAction = () => {
  const [rewardGranted, setRewardGranted] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const rewardedAd = RewardedAd.createForAdRequest(adUnitIdRewarded!);

  const loadAd = useCallback(() => {
    if (!adUnitIdRewarded) return;
    setIsLoading(true);
    try {
      rewardedAd.load();
    } catch (e) {
      console.warn('rewardedAd.load() hata:', e);
      setIsLoading(false);
    }
  }, [rewardedAd]);

  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    // LIST OF EVENTS TO ATTACH: LOADED, ERROR, CLOSED come from AdEventType in many versions,
    // but some versions expect RewardedAdEventType for these too. We attempt both.
    const events = [
      { name: 'LOADED', handler: () => { setAdLoaded(true); setIsLoading(false); } },
      { name: 'ERROR', handler: (err: any) => { console.error('Ödüllü Reklam Hatası:', err); setIsLoading(false); /* optional: loadAd(); */ } },
      { name: 'CLOSED', handler: () => { setAdLoaded(false); /* prepare next */ loadAd(); } },
    ];

    for (const ev of events) {
      const constName = getEventConst(ev.name);
      if (!constName) {
        console.log(`Event constant not found for ${ev.name} (skipping)`);
        continue;
      }
      try {
        const unsub = rewardedAd.addAdEventListener(constName as any, ev.handler as any);
        if (typeof unsub === 'function') unsubscribers.push(unsub);
      } catch (err) {
        // Eğer kütüphane bu event type'ı kabul etmezse burada yakalarız
        console.warn(`addAdEventListener refused event ${ev.name}:`, err);
      }
    }

    // EARNED_REWARD: öncelikle RewardedAdEventType'da olmalı; fallback deniyoruz.
    const rewardEventName = (RewardedAdEventType as any)?.EARNED_REWARD ?? (AdEventType as any)?.EARNED_REWARD;
    if (rewardEventName) {
      try {
        const unsub = rewardedAd.addAdEventListener(rewardEventName as any, (reward: any) => {
          console.log('Reward earned:', reward);
          setRewardGranted(true);
        });
        if (typeof unsub === 'function') unsubscribers.push(unsub);
      } catch (err) {
        console.warn('addAdEventListener refused EARNED_REWARD:', err);
      }
    } else {
      console.warn('EARNED_REWARD event constant bulunamadı.');
    }

    // İlk reklamı yükle
    loadAd();

    return () => {
      for (const u of unsubscribers) {
        try { u(); } catch (e) { /* ignore */ }
      }
    };
  }, [rewardedAd, loadAd]);

  const showAd = () => {
    if (adLoaded) {
      try {
        rewardedAd.show();
      } catch (e) {
        console.error('rewardedAd.show() hata:', e);
        return false;
      }
      return true;
    }
    return false;
  };

  const resetReward = () => setRewardGranted(false);

  return { showAd, rewardGranted, resetReward, adLoaded, isLoading };
};

// default export for expo-router route requirement
export default AppBannerAd;
