import React, { useState } from "react";
import {
  Alert,
  Button,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { WebView } from "react-native-webview"; // Webview tekrar aktif edildi

// Instagram'ın Accounts Center üzerinden veri indirme başlangıç sayfası
const ACCOUNTS_CENTER_DATA_URL = "https://accountscenter.instagram.com/info_and_permissions/dyi/?entry_point=deeplink_screen";

// Uygulama Durumları
type AppState = 'HOME' | 'PASTE_LINK' | 'DOWNLOAD_WEBVIEW';

export default function App() {
  const [username, setUsername] = useState("");
  const [appState, setAppState] = useState<AppState>('HOME'); // Uygulama durumunu yöneten state
  const [downloadLink, setDownloadLink] = useState(""); // Yapıştırılan linki tutan state

  // 1. Aşama: Veri Talebi Başlat (Harici Tarayıcı)
  const handleStartRequest = async () => {
    Alert.alert(
      "Veri Talep Akışı",
      "Instagram veri indirme talebi süreci, güvenliğiniz için şimdi tarayıcınızda açılacaktır. Lütfen tarayıcıda hesabınıza giriş yapın ve talebinizi oluşturun. İndirme linkiniz e-posta adresinize gelecektir.",
      [{ text: "Anladım ve Devam Et", onPress: initiateExternalLink }]
    );
  };

  const initiateExternalLink = async () => {
    try {
      const supported = await Linking.canOpenURL(ACCOUNTS_CENTER_DATA_URL);

      if (supported) {
        await Linking.openURL(ACCOUNTS_CENTER_DATA_URL);
      } else {
        Alert.alert("Hata", `Tarayıcıda bu linki açamıyoruz: ${ACCOUNTS_CENTER_DATA_URL}`);
      }
    } catch (error) {
      console.error("Link açılırken hata oluştu:", error);
      Alert.alert("Hata", "Link açılırken beklenmedik bir sorun oluştu.");
    }
  };
  
  // 2. Aşama: Link Yapıştırma Ekranına Geçiş
  const handleGoToPasteLink = () => {
    setAppState('PASTE_LINK');
  };
  
  // 3. Aşama: Webview'ı Başlat (Yapıştırılan Linki Açma)
  const handleInitiateDownload = () => {
    if (!downloadLink.trim() || !downloadLink.startsWith("http")) {
      Alert.alert("Hata", "Lütfen geçerli bir URL yapıştırdığınızdan emin olun.");
      return;
    }
    // Webview'ı aç ve linki yükle
    setAppState('DOWNLOAD_WEBVIEW');
  };

  // Uygulama içeriğini durumuna göre render eden fonksiyon
  const renderContent = () => {
    switch (appState) {
      case 'HOME':
        return (
          <View style={styles.content}>
            <Text style={styles.title}>Instagram Veri Analizi Projesi</Text>
            <Text style={styles.description}>
              Veri indirme talebinizi güvenle oluşturmak için sizi tarayıcınıza yönlendireceğiz.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Kullanıcı adınız (Opsiyonel)"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <Button
              title="1. Veri Talebini Başlat (Tarayıcıda Aç)"
              onPress={handleStartRequest}
            />

            <Text style={styles.stepTitle}>2. Aşama: İndirme Linkini Yakala</Text>
            <Text style={styles.description}>
              E-posta ile indirme linkiniz geldiğinde, o linki yapıştırmak için butona tıklayın.
            </Text>
            <View style={styles.buttonSpacing}>
              <Button 
                title="İndirme Linkini Yapıştır" 
                onPress={handleGoToPasteLink} 
              />
            </View>

          </View>
        );

      case 'PASTE_LINK':
        return (
          <View style={styles.content}>
            <Text style={styles.title}>İndirme Linkini Yapıştır</Text>
            <Text style={styles.description}>
              Lütfen Instagram'ın size e-posta ile gönderdiği indirme linkini buraya yapıştırın.
            </Text>
            <TextInput
              style={[styles.input, styles.linkInput]}
              placeholder="https://download.instagram.com/d/..."
              value={downloadLink}
              onChangeText={setDownloadLink}
              autoCapitalize="none"
              multiline={true}
              numberOfLines={4}
            />
            <Button
              title="İndirme Sayfasını Aç"
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
            <View style={styles.webviewHeader}>
                <Text style={styles.webviewTitle}>Lütfen İndir Butonuna Tıklayın</Text>
                <Button title="Geri" onPress={() => setAppState('PASTE_LINK')} color="#FF4500" />
            </View>
            <WebView
              source={{ uri: downloadLink }}
              style={styles.webview}
              startInLoadingState={true}
            />
          </View>
        );

      default:
        return null;
    }
  };


  return (
    <View style={styles.container}>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    paddingTop: Platform.OS === 'ios' ? 50 : 0,
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
    height: 100, // Daha uzun bir yapıştırma alanı
    textAlignVertical: 'top',
  },
  buttonSpacing: {
    marginTop: 15,
    width: '100%',
  },
  // Yeni eklenen stiller
  webviewContainer: {
    flex: 1,
  },
  webviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  webviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  webview: {
    flex: 1,
  },
});