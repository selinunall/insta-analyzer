import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import {
  AdEventType,
  BannerAd,
  BannerAdSize,
  RewardedAd,
  RewardedAdEventType, // Yeni: Ödüllü reklam olay tipleri için eklendi
  TestIds
} from 'react-native-google-mobile-ads';
//jljıkjlo
// AdMob Test Reklam Kimlikleri (Lütfen kendi gerçek kimliklerinizi BURAYA YAPIŞTIRMAYIN)
const adUnitIdBanner = Platform.select({
  ios: TestIds.BANNER, 
  android: TestIds.BANNER,
});

const adUnitIdRewarded = Platform.select({
  ios: TestIds.REWARDED, 
  android: TestIds.REWARDED, 
});

// Banner Reklam Bileşeni
export const AppBannerAd: React.FC = () => {
  if (!adUnitIdBanner) return null;

  return (
    <View style={{ alignItems: 'center', marginVertical: 10 }}>
      <BannerAd
        unitId={adUnitIdBanner}
        size={BannerAdSize.BANNER}
        onAdFailedToLoad={(error) => {
          console.error('Banner Reklam yüklenemedi:', error);
        }}
        onAdLoaded={() => {
          console.log('Banner Reklam başarıyla yüklendi.');
        }}
      />
    </View>
  );
};

// Ödüllü Reklam Kontrolü için Hook
export const useAdBasedAction = () => {
  const [rewardGranted, setRewardGranted] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Reklam birimini manuel olarak oluştur
  const rewardedAd = RewardedAd.createForAdRequest(adUnitIdRewarded!);

  // Reklamı yükleme işlevi
  const loadAd = useCallback(() => {
    if (!adUnitIdRewarded) return;
    setIsLoading(true);
    rewardedAd.load();
  }, [rewardedAd]);

  useEffect(() => {
    // Kütüphane, olay tipini ve dinleyiciyi ayrı ayrı bekliyor.
    // Bu, kodun kütüphanenin güncel TypeScript tanımlamalarına uygun halidir.

    const unsubscribeLoaded = rewardedAd.addAdEventListener(AdEventType.LOADED, () => {
        setAdLoaded(true);
        setIsLoading(false);
    });

    const unsubscribeError = rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.error('Ödüllü Reklam Hatası:', error);
        setIsLoading(false);
        // Hata durumunda yeniden yüklemeyi dene
        loadAd(); 
    });

    const unsubscribeClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
        setAdLoaded(false); 
        // Reklam kapandıktan sonra yeni bir reklamı yüklemeye başla
        loadAd();
    });

    // EARNED_REWARD tipini RewardedAdEventType'dan almalıyız.
    const unsubscribeReward = rewardedAd.addAdEventListener(
      (RewardedAdEventType as any).EARNED_REWARD ?? 'earned',
      (reward: any) => {
        console.log('Reward earned:', reward);
        setRewardGranted(true);
      });
    
    // Bileşen yüklendiğinde ilk reklamı yükle
    loadAd();

    // Temizleme işlevi: Tüm dinleyicileri kaldır
    return () => {
        unsubscribeLoaded();
        unsubscribeError();
        unsubscribeClosed();
        unsubscribeReward();
    };
  }, [rewardedAd, loadAd]); 
  
  // Reklamı gösterme işlevi
  const showAd = () => {
    if (adLoaded) {
      rewardedAd.show();
      return true; // Gösterim başarılı
    }
    return false; // Reklam henüz yüklenmedi
  };

  // Ödül bayrağını sıfırlama işlevi (İşlem tamamlandıktan sonra çağrılmalı)
  const resetReward = () => setRewardGranted(false);
  
  return { showAd, rewardGranted, resetReward, adLoaded, isLoading };
};

export default AppBannerAd;