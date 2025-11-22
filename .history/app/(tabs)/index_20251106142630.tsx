import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview"; // WebViewNavigation tipi eklendi

// Instagram'ın Accounts Center üzerinden veri indirme başlangıç sayfası:
const ACCOUNTS_CENTER_DATA_URL = "https://accountscenter.instagram.com/info_and_permissions/dyi/?entry_point=deeplink_screen";

// Uygulama Durumları
type AppState = 'HOME' | 'PASTE_LINK' | 'DOWNLOAD_WEBVIEW' | 'PROCESSING';

export default function App() {
  const [appState, setAppState] = useState<AppState>('HOME');
  const [username, setUsername] = useState("");
  const [downloadLink, setDownloadLink] = useState("");
  const [finalDataUrl, setFinalDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Aşama: Veri Talebi Başlat
  const handleStartRequest = async () => {
    try {
      const supported = await Linking.canOpenURL(ACCOUNTS_CENTER_DATA_URL);

      if (supported) {
        await Linking.openURL(ACCOUNTS_CENTER_DATA_URL);
        
        Alert.alert(
          "Talimat",
          "Lütfen tarayıcıda Instagram'a giriş yapın ve 'Bilgilerini İndir' talebini oluşturun. İndirme linki E-posta adresinize geldiğinde, uygulamaya geri dönüp 'Link Yapıştır' butonuna tıklayarak devam edin.",
          [{ text: "Anladım", onPress: () => setAppState('HOME') }] // State'i değiştirmeden Home'da kal
        );

      } else {
        Alert.alert("Hata", `Tarayıcıda bu linki açamıyoruz: ${ACCOUNTS_CENTER_DATA_URL}`);
      }
    } catch (error) {
      console.error("Link açılırken hata oluştu:", error);
      Alert.alert("Hata", "Link açılırken bir sorun oluştu.");
    }
  };

  // 2. Aşama: Link Yapıştırma Ekranına Geçiş
  const handleGoToPasteLink = () => {
    setAppState('PASTE_LINK');
  };

  // 3. Aşama: Webview'ı Başlat (Veri İndirme Linkini Yakalama)
  const handleInitiateDownload = () => {
    if (!downloadLink.startsWith("https://download.instagram.com")) {
      Alert.alert("Hata", "Lütfen geçerli bir Instagram indirme linki yapıştırdığınızdan emin olun.");
      return;
    }
    setAppState('DOWNLOAD_WEBVIEW');
    setIsLoading(true);
  };
  
  // 4. Aşama: Webview Navigasyonunu Dinleme (KRİTİK KISIM)
  const onNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    // 1. Adım: Yükleme bittiğinde Webview'ın yükleme durumunu kapat.
    if (!navState.loading && isLoading) {
      setIsLoading(false);
    }

    // 2. Adım: Başarılı indirme linki genellikle uzun ve doğrudan bir dosya URL'sidir.
    // Webview içindeki "İndir" butonuna tıklandığında bu link tetiklenir.
    
    // Geçici indirme URL'lerini yakalama denemesi
    // 'download_url' genelde ZIP dosyasının kendisidir.
    if (navState.url.includes("download_url=")) {
      console.log("!!! Veri İndirme URL'si Yakalandı !!!");
      console.log("Yakalanan URL:", navState.url);

      // Webview'ı durdur
      // setAppState('PROCESSING'); 
      // setFinalDataUrl(navState.url);

      // İndirme işlemi tarayıcı dışına çıktığı için Webview'da yüklenmeyecektir.
      // Bu URL'yi yakaladığınız anda Webview'ı kapatın ve indirme/işleme aşamasına geçin.

      // Burada indirme işlemini başlatacak fonksiyonunuzu çağıracaksınız (örneğin: downloadAndProcess(navState.url))
      
      // Kullanıcıya bilgi verip işleme aşamasına geç
      Alert.alert("Başarılı!", "İndirme linki yakalandı. Veri işleniyor...");
      setAppState('PROCESSING');
      setFinalDataUrl(navState.url);
      
      // Önemli Not: Gerçek uygulamada, bu yakalanan URL'yi kullanarak
      // 'react-native-fs' gibi bir kütüphane ile arka planda indirme yapmalısınız.
      
      return false; // Webview'da bu indirme linkini yüklemeyi durdur.
    }

    // Eğer kullanıcı başka bir yere gitmeye çalışırsa, ana sayfaya yönlendir
    if (!navState.url.includes("download.instagram.com") && appState === 'DOWNLOAD_WEBVIEW') {
        // Bu kısım, indirme linkini Webview'da açtıktan sonra kullanıcı login olmazsa
        // veya başka bir sayfaya yönlendirilirse tetiklenebilir.
        // Güvenlik açısından önemli navigasyonları izlemek için kullanılabilir.
    }

    // Navigasyonun devam etmesine izin ver
    return true; 
  }, [appState, isLoading]);


  // 5. Aşama: Arayüz Render'ı
  const renderContent = () => {
    switch (appState) {
      case 'HOME':
        return (
          <View style={styles.content}>
            <Text style={styles.title}>Instagram Veri Analizi Projesi</Text>
            <Text style={styles.description}>
              Veri indirme talebinizi oluşturmak için sizi Instagram'ın resmi Meta Hesap Merkezi sayfasına yönlendireceğiz.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Kullanıcı adınız (Opsiyonel)"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <Button title="1. Veri Talebini Başlat (Tarayıcıda Aç)" onPress={handleStartRequest} />
            
            <Text style={styles.stepTitle}>Sonraki Adım:</Text>
            <Text style={styles.description}>
              E-posta ile indirme linkiniz geldiğinde, '2. İndirme Linkini Yapıştır' butonuna tıklayarak devam edin.
            </Text>
            <View style={styles.buttonSpacing}>
               <Button title="2. İndirme Linkini Yapıştır" onPress={handleGoToPasteLink} />
            </View>

          </View>
        );

      case 'PASTE_LINK':
        return (
          <View style={styles.content}>
            <Text style={styles.title}>İndirme Linkini Yapıştır</Text>
            <Text style={styles.description}>
              Lütfen Instagram'ın size e-posta ile gönderdiği tek kullanımlık indirme linkini buraya yapıştırın. Bu link, indirme işlemini Webview içinde tetikleyecektir.
            </Text>
            <TextInput
              style={[styles.input, styles.linkInput]}
              placeholder="https://download.instagram.com/d/..."
              value={downloadLink}
              onChangeText={setDownloadLink}
              autoCapitalize="none"
            />
            <Button 
              title="İndirme Sayfasını Aç ve Linki Yakala" 
              onPress={handleInitiateDownload} 
              disabled={!downloadLink.trim()}
            />
            <View style={styles.buttonSpacing}>
                <Button title="Geri Dön" onPress={() => setAppState('HOME')} color="#888" />
            </View>
          </View>
        );

      case 'DOWNLOAD_WEBVIEW':
        return (
          <View style={styles.webviewContainer}>
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>İndirme Sayfası Yükleniyor...</Text>
                <Text style={styles.loadingSubText}>Lütfen indirme butonuna tıklayın.</Text>
              </View>
            )}
            <WebView
              source={{ uri: downloadLink }}
              style={styles.webview}
              onNavigationStateChange={onNavigationStateChange}
              // Bu event Android'de URL'nin yüklenmeye başlayıp başlamayacağını kontrol eder.
              // Eğer indirme linkine tıklanırsa, bu event tetiklenir.
              onShouldStartLoadWithRequest={(event) => onNavigationStateChange(event)}
              startInLoadingState={true}
            />
          </View>
        );

      case 'PROCESSING':
        return (
          <View style={styles.processingContainer}>
            <Text style={styles.title}>Verileriniz İşleniyor...</Text>
            <ActivityIndicator size="large" color="#4CAF50" style={{ marginVertical: 20 }} />
            <Text style={styles.description}>
              Güvenli indirme linki yakalandı ve şu anda uygulama, indirdiğiniz verileri (ZIP/JSON) analiz etmeye hazırlanıyor.
            </Text>
            <Text style={styles.dataUrl}>Yakalanan Linkin Başlangıcı: {finalDataUrl?.substring(0, 50)}...</Text>
            <View style={styles.buttonSpacing}>
                <Button title="Ana Sayfaya Dön" onPress={() => {setAppState('HOME'); setFinalDataUrl(null)}} />
            </View>
          </View>
        );
      
      default:
        return null;
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
  },
  content: {
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    fontWeight: "800",
    color: "#333",
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  stepTitle: {
    fontSize: 18,
    marginTop: 30,
    marginBottom: 10,
    fontWeight: "700",
    color: "#007AFF",
  },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  linkInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonSpacing: {
    marginTop: 15,
    width: '100%',
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100, // Yeterince küçük bir alan gösterin
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 10,
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#ddd'
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingSubText: {
    fontSize: 12,
    color: '#666',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#E8F5E9', // Açık yeşil arka plan
  },
  dataUrl: {
    marginTop: 15,
    fontSize: 12,
    color: '#4CAF50',
    textAlign: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4CAF50',
  }
});