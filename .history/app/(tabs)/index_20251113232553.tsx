import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { WebView } from "react-native-webview";

const BACKEND_URL = "http://192.168.1.35:5000/analyze";  
const ACCOUNTS_CENTER_DATA_URL = "https://accountscenter.instagram.com/info_and_permissions/dyi/?entry_point=deeplink_screen"; 

interface AllMetrics {
    total_followers: number;
    total_following: number;
    unfollowed_count: number;
    not_following_back_count: number;
    mutual_following_count: number;
    you_not_following_count: number;
    blocked_count: number;
    hide_story_count: number;
    accepted_requests_count: number;
}

interface InstagramAnalysisResult {
    all_metrics: AllMetrics;
}

// Uygulama Durumları: HOME -> PASTE_LINK -> DOWNLOAD_WEBVIEW -> PROCESSING
type AppState = 'HOME' | 'REQUEST_WEBVIEW' | 'DOWNLOAD_WEBVIEW' | 'PROCESSING' | 'ANALYSIS_RESULTS';

// webviewHeader'ın tahmini yüksekliği 
const WEBVIEW_HEADER_HEIGHT = 100; 

export default function App() {
  const [username, setUsername] = useState("");
  const [appState, setAppState] = useState<AppState>('HOME'); 
  const [finalDataUrl, setFinalDataUrl] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<InstagramAnalysisResult | null>(null);

  // 1. Aşama: Veri Talep Akışı 
  const handleStartRequest = async () => {
    Alert.alert(
      "Veri Talep Akışı",
      "Instagram veri indirme talebi süreci, güvenliğiniz için şimdi tarayıcınızda açılacaktır. Lütfen tarayıcıda hesabınıza giriş yapın ve talebinizi oluşturun. İndirme linkiniz e-posta adresinize gelecektir.",
      [
        { text: "İptal", style: "cancel" },
        { text: "Anladım ve Devam Et", onPress: ()=> setAppState('REQUEST_WEBVIEW') }
      ]
    );
  };

  // 3. Aşama: Webview'ı Başlat (indirme sayfasını Açma)
  const handleStartDownloadWebView = () => {
      Alert.alert(
          "İndirme Sayfasına Yönlendirme",
          "Bu ekranda Instagram'da oturum açmanız, indirmeye hazır olan verilerinizi bulmanız ve 'İndir' butonuna tıklamanız gerekmektedir. Kritik indirme linki (bigzipfiles.instagram.com) bu sayede yakalanacaktır.",
          [
              { text: "İptal", style: "cancel" },
              { text: "Anladım ve Devam Et", onPress: () => setAppState('DOWNLOAD_WEBVIEW') }
          ]
      );
  };

  // KRİTİK FONKSİYON: İndirme URL'sini yakalar ve Webview navigasyonunu durdurur.
  const handleDownloadLinkCapture = (request: any) => {
    const url = request.url;

    // HATA AYIKLAMA İÇİN LOG
    console.log("WebView Navigasyon Kontrolü:", url); 
    
    if (
        url.includes('bigzipfiles.instagram.com') 
    ) {
      console.log("KRİTİK BAŞARI: Nihai indirme linki yakalandı! URL:", url);

      setFinalDataUrl(url); 
      setAppState('PROCESSING'); 
      
      return false;
    }
    
    return true;
  };
  
  // YENİ FONKSİYON: Geri butonuna basıldığında çağrılır.
  const handleGoBack = () => {
      console.log("Kullanıcı Geri butonuna tıkladı. PASTE_LINK ekranına dönülüyor.");
      setFinalDataUrl(null); 
      setAnalysisResults(null); 
      setAppState('HOME'); 
  }

  useEffect(() => {
    if (appState === 'PROCESSING' && finalDataUrl) {

      const sendDataToBackend = async () => {
        console.log("Backend API'sine veri gönderiliyor...");
        
        try {
          const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                downloadUrl: finalDataUrl,
            }),
          });
          
          const data = await response.json();
          
          if (response.ok && data.status === 'success') {
            const results = data.results as InstagramAnalysisResult;

                        if (results && results.all_metrics) {
                            setAnalysisResults(results);
                            setAppState('ANALYSIS_RESULTS');
                        } else {
                            // Backend'den doğru yapıda veri gelmediyse hata fırlat
                            throw new Error("Analiz sonuçlarında beklenen 'all_metrics' alanı bulunamadı.");
                        }
          } else {
            const errorMessage = data.message || "Bilinmeyen bir sunucu hatası oluştu.";
            console.error("Backend hatası:", errorMessage);
            Alert.alert("Analiz Hatası", `Sunucudan hata geldi: ${errorMessage}`);
            setAppState('HOME'); // Hata durumunda link yapıştırma ekranına geri dön
          }
          
        } catch (error) {
          console.error("API isteği sırasında ağ hatası:", error);
          Alert.alert(
            "Bağlantı Hatası", 
            `Backend sunucusuna (${BACKEND_URL}) bağlanılamadı. Lütfen sunucunuzun çalıştığından ve doğru IP adresini kullandığınızdan emin olun.`,
            [{ text: "Tamam", onPress: () => setAppState('HOME') }]
          );
        }
      };
      sendDataToBackend();
    }
  }, [appState, finalDataUrl]);


  const renderContent = () => {
    switch (appState) {
      case 'HOME':
        return (
          <View style={styles.stepsContainer}>
            <View style={styles.stepCard}>
              <View style={styles.infoRow}>
               <Text style={styles.infoText}>Bilgi için tıkla.</Text>
                <Icon name="info" size={25} color="#0927eb" />
              </View>  
              <Text style={styles.stepNumber}>1. Adım</Text>
               <Text style={styles.stepDescription}>Instagram’dan veri talebinde bulunun.</Text>
               <Button title="Veri Talep Et" onPress={handleStartRequest} color="#0927eb" />         
          </View>
            

          <View style={styles.stepCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Bilgi için tıkla.</Text>
              <Icon name="info" size={25} color="#0927eb" />
            </View>
            <Text style={styles.stepNumber}>2. Adım</Text>
            <Text style={styles.stepDescription}>Instagram tarafından, verilerinizin hazır olduğuna dair e-mail alın.</Text>
            <Button title="E-mail Kontrol" color="#0927eb" />
          </View>


          <View style={styles.stepCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Bilgi için tıkla.</Text>
              <Icon name="info" size={25} color="#0927eb" />
            </View>
            <Text style={styles.stepNumber}>3. Adım</Text>
            <Text style={styles.stepDescription}>Instagram tarafından hazırlanan verileri indirin.</Text>
            <Button title="Verileri Yükle" onPress={handleStartDownloadWebView} color="#0927eb" />
          </View>
        </View>
        );

       // 🔹 YENİ: 1. Aşama WebView Ekranı
    case 'REQUEST_WEBVIEW':
      return (
        <View style={styles.webviewContainer}>
          <WebView
            source={{ uri: ACCOUNTS_CENTER_DATA_URL }}
            style={styles.webview}
            startInLoadingState={true}
          />
          <View style={styles.webviewHeader}>
            <Text style={styles.webviewTitle}>Instagram Veri Talebi</Text>
            <Button
              title="Geri"
              onPress={() => setAppState('HOME')}
              color="#FF4500"
            />
          </View>
        </View>
      );  

      case 'DOWNLOAD_WEBVIEW':
        return (
          <View style={styles.webviewContainer}>
            <WebView
              source={{ uri: ACCOUNTS_CENTER_DATA_URL }} 
              style={styles.webview}
              startInLoadingState={true}
              // KRİTİK: İndirme linkini burada yakalıyoruz
              onShouldStartLoadWithRequest={handleDownloadLinkCapture} 
            />
            <View style={styles.webviewHeader}>
              <Text style={styles.webviewTitle}>Lütfen Oturum Açın ve İndir Butonuna Tıklayın</Text>
              <Button title="Geri" onPress={handleGoBack} color="#FF4500" /> 
            </View>
          </View>
        );

      case 'PROCESSING':
        return (
          <View style={styles.processingContent}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.processingTitle}>Veriler İşleniyor...</Text>
            <Text style={styles.processingDescription}>
              İndirme linki başarıyla yakalandı. Şimdi verileriniz sunucumuz tarafından güvenli bir şekilde indiriliyor ve analiz ediliyor.
              <Text style={styles.debugTextSmall}>Backend adresi: {BACKEND_URL}</Text>
            </Text>
            {finalDataUrl && 
                <View style={styles.debugInfo}>
                    <Text style={styles.debugText}>Yakalanan Link (Kritik):</Text>
                    <Text style={styles.debugTextSmall}>{finalDataUrl.substring(0, 100)}...</Text>
                </View>
            }
            <View style={styles.buttonSpacing}>
                <Button title="İptal ve Ana Ekrana Dön" onPress={() => setAppState('HOME')} color="#FF4500" />
            </View>
          </View>
        );

      case 'ANALYSIS_RESULTS':
                if (analysisResults && analysisResults.all_metrics) {
                    const metrics = analysisResults.all_metrics;

                    return (
                        <ScrollView style={styles.container}>
                            <View style={styles.content}>
                                <Text style={styles.title}>Kapsamlı Takip Analizi Sonuçları</Text>
                            
                                <Text style={styles.header}>Takip İlişkileri Özeti</Text>
                                <Text style={styles.summaryText}>
                                    Toplam Takipçi: **{metrics.total_followers}** | Toplam Takip Edilen: **{metrics.total_following}**
                                </Text>

                                {/* GÖSTERİLMEK İSTENEN 7 DETAYLI METRİK */}
                                <View style={styles.resultsCard}>
                                    
                                    {/* 1. Son Zamanlarda Takibi Bıraktıklarım */}
                                    <Text style={styles.resultItemTitle}>1. Son Zamanlarda Takibi Bıraktıklarım:</Text>
                                    <Text style={styles.resultItemValue}>{metrics.unfollowed_count}</Text>
                                    <View style={styles.separator} />

                                    {/* 2. Geri Takip Etmeyenler */}
                                    <Text style={styles.resultItemTitle}>2. Sizin Takip Edip, Onların Geri Etmediği (GT Yapmayan):</Text>
                                    <Text style={styles.resultItemValue}>{metrics.not_following_back_count}</Text>
                                    <View style={styles.separator} />
                                    
                                    {/* 3. Karşılıklı Takip Sayısı */}
                                    <Text style={styles.resultItemTitle}>3. Karşılıklı Takip Sayısı:</Text>
                                    <Text style={styles.resultItemValue}>{metrics.mutual_following_count}</Text>
                                    <View style={styles.separator} />
                                    
                                    {/* 4. Geri Takip Etmedikleriniz (Onlar Sizi Ediyor, Siz Onları Etmiyorsunuz) */}
                                    <Text style={styles.resultItemTitle}>4. Onların Takip Edip, Sizin Etmediğiniz:</Text>
                                    <Text style={styles.resultItemValue}>{metrics.you_not_following_count}</Text>
                                    <View style={styles.separator} />

                                    {/* 5. Engellediğiniz Profil Sayısı */}
                                    <Text style={styles.resultItemTitle}>5. Engellediğiniz Profil Sayısı:</Text>
                                    <Text style={styles.resultItemValue}>{metrics.blocked_count}</Text>
                                    <View style={styles.separator} />

                                    {/* 6. Hikayenizi Gizlediğiniz Kişi Sayısı */}
                                    <Text style={styles.resultItemTitle}>6. Hikayenizi Gizlediğiniz Kişi Sayısı:</Text>
                                    <Text style={styles.resultItemValue}>{metrics.hide_story_count}</Text>

                                    <View style={styles.separator} />

                                    {/* 7. Kabul Edilen Takip İstekleri */}
                                    <Text style={styles.resultItemTitle}>7. Kabul Ettiğiniz Takip İstekleri:</Text>
                                    <Text style={styles.resultItemValue}>{metrics.accepted_requests_count}</Text>
                                    
                                </View>

                                <Button title="Yeni Analiz Başlat" onPress={() => setAppState('HOME')} color="#007AFF" />
                            </View>
                        </ScrollView>
                    );
                }
              
                return (
                    <View style={styles.container}>
                        <Text style={styles.title}>Hata</Text>
                        <Text style={styles.description}>Analiz sonuçları yüklenemedi veya veri bulunamadı.</Text>
                        <Button title="Geri Dön" onPress={() => setAppState('HOME')} color="#FF4500" />
                    </View>
                );

            default:
                return null;
        }
    };
  // HEADER (üst menü)
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Icon name="menu" size={28} color="#fff" style={styles.menuIcon} />
      <Text style={styles.headerTitle}>Followly</Text>
      <View style={{ width: 28 }} />
    </View>
  );

    return (
  <View style={styles.container}>
      {renderHeader()}  
      <View style={styles.pageContent}> 
          {renderContent()}  
      </View>
  </View>
);

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#d4e6ff",
    // iOS'ta status bar'ın altından başlaması için
    paddingTop: Platform.OS === 'ios' ? 50 : 0, 
  },
  content: {
    padding: 20,
    alignItems: "center",
  },
  processingContent: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 15,
    color: '#333',
  },
  processingDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
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

  buttonSpacing: {
    marginTop: 15,
    width: '100%',
  },
  webviewContainer: {
    flex: 1,
    // Başlık ve Webview'ı dikey olarak sırala
    //flexDirection: 'column', 
  },
  webviewHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#ddd',
    height: WEBVIEW_HEADER_HEIGHT, 
    zIndex: 10, 
    elevation: 5, // Android için gölge
  },
  header: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 5,
        color: '#333',
    },
    summaryText: {
        fontSize: 16,
        color: '#007AFF',
        marginBottom: 20,
        fontWeight: '600',
    },
  webviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  webview: {
    // webviewHeader'ın hemen altından başlayıp kalan alanı doldurur.
    flex: 1, 
    marginTop: WEBVIEW_HEADER_HEIGHT+ (Platform.OS === 'ios' ? 50 : 0),
  },
 // Yeni sonuç kartı stilleri
  resultsCard: {
    width: '100%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 20,
  },
  resultItemTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  resultItemValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },

  debugInfo: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#ffe5e5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff6666',
    maxWidth: '100%',
  },
  sectionTitle: {
  fontSize: 20,
  fontWeight: '700',
  color: '#000',
  alignSelf: 'flex-start',
  marginLeft: 20,
  marginTop: 10,
  marginBottom: 10,
},
  debugText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#333',
  },
  debugTextSmall: {
    fontSize: 10,
    color: '#666',
    marginTop: 5,
  },
  menuIcon: {
    position: 'absolute',
    left: 20,
    top: 12,
  },
  headerContainer: {
    flexDirection: 'row',
    backgroundColor: '#0927eb',
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5, // Android gölgesi
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },

  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    
  },
  stepsContainer: {
  flexDirection: 'column',       // kartları dikeyde hizalar
  justifyContent: 'space-around', // aralarında eşit boşluk bırakır
  alignItems: 'center',
  marginTop: 15,
  paddingHorizontal: 10,
},

stepCard: {
  width: '90%',               // 3 kartın yan yana sığması için %30 genişlik
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 10,
  padding: 10,
  alignItems: 'flex-start',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
  marginBottom: 15,
},

infoRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
},

infoText: {
  fontSize: 10,
  color: '#333',
},

stepNumber: {
  fontWeight: 'bold',
  fontSize: 14,
  marginTop: 5,
  color: '#000',
},

stepDescription: {
  fontSize: 11,
  textAlign: 'center',
  color: '#333',
  marginVertical: 5,
},

  pageContent: {
    flex: 1,
    paddingTop: 10,
  },
});