/*import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import {
    BannerAd,
    BannerAdSize,
    RewardedAd,
    RewardedAdEventType,
} from "react-native-google-mobile-ads";

// --- Banner Ad IDs ---
const ANDROID_BANNER_ID = "ca-app-pub-9138768479487019/4609996719";
const IOS_BANNER_ID = "ca-app-pub-9138768479487019/3436515840";

// --- Rewarded Ad IDs ---
const ANDROID_REWARDED_ID = "ca-app-pub-9138768479487019/3492479879";
const IOS_REWARDED_ID = "ca-app-pub-9138768479487019/8497270832";

// Choose based on platform
const BANNER_ID = Platform.OS === "android" ? ANDROID_BANNER_ID : IOS_BANNER_ID;
const REWARDED_ID = Platform.OS === "android" ? ANDROID_REWARDED_ID : IOS_REWARDED_ID;

// Create rewarded object (global)
export const rewarded = RewardedAd.createForAdRequest(REWARDED_ID);

// Custom Hook for Rewarded Ads
export function useRewardedAd(onRewardEarned: () => void) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => setLoaded(true)
    );

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        onRewardEarned();
      }
    );

    // Load first time
    rewarded.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
    };
  }, []);

  const showAd = useCallback(() => {
    if (loaded) {
      rewarded.show();
      setLoaded(false);
      rewarded.load();
    }
  }, [loaded]);

  return { loaded, showAd };
}

// Component to display Banner Ad
export function Banner() {
  return (
    <BannerAd
      unitId={BANNER_ID}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
    />
  );
}*/