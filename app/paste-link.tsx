// app/paste-link.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

export default function PasteLinkScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const [loading, setLoading] = useState(true);
  const webRef = useRef<WebView>(null);
  const router = useRouter();

  const injectedJS = `
    (function() {
      document.addEventListener('click', function(e) {
        try {
          var el = e.target;
          while (el && !el.href) el = el.parentElement;
          if (el && el.href && (el.href.endsWith('.zip') || el.href.includes('/download/'))) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'downloadUrl', url: el.href }));
          }
        } catch (err) {}
      }, true);

      (function(open) {
        XMLHttpRequest.prototype.open = function() {
          this.addEventListener('load', function() {
            try {
              var ct = this.getResponseHeader('content-type') || '';
              if (ct.includes('application/zip') || ct.includes('octet-stream')) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'downloadUrl', url: this.responseURL }));
              }
            } catch (err) {}
          });
          open.apply(this, arguments);
        };
      })(XMLHttpRequest.prototype.open);
    })();
    true;
  `;

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "downloadUrl") {
        Alert.alert("İndirme bağlantısı bulundu!", data.url);
        console.log("Download URL:", data.url);
        // Backend'e gönderme (isteğe bağlı)
        // fetch("https://your-backend/api/save_link", { method: "POST", body: JSON.stringify({ link: data.url }) });
        router.back();
      }
    } catch (e) {
      console.log("message parse error:", e);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#000" />
          <Text>Sayfa yükleniyor...</Text>
        </View>
      )}
      <WebView
        ref={webRef}
        source={{ uri: url || "https://www.instagram.com/download/request/" }}
        onLoadEnd={() => setLoading(false)}
        onMessage={onMessage}
        injectedJavaScript={injectedJS}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        allowsBackForwardNavigationGestures
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
