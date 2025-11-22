import React, { useState } from "react";
import {
  Alert,
  Button, // SafeAreaView yerine ana View kullanıldı
  Linking,
  // SafeAreaView kaldırıldı
  Platform // Platform'a özel stil için eklendi
  ,

  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
// import { WebView } from "react-native-webview"; // Artık Webview kullanılmıyor

// Instagram'ın Accounts Center üzerinden veri indirme başlangıç sayfası
const ACCOUNTS_CENTER_DATA_URL = "https://accountscenter.instagram.com/info_and_permissions/dyi/?entry_point=deeplink_screen";

export default function App() {
  const [username, setUsername] = useState("");

  // Kullanıcıyı harici tarayıcıya yönlendirerek veri indirme sürecini başlatır
  const handleDownload = async () => {
    
    // Kullanıcıya talep akışının tarayıcıda gerçekleşeceği bilgisini verelim.
    Alert.alert(
      "Veri Talep Akışı",
      "Instagram veri indirme talebi süreci, güvenliğiniz için şimdi tarayıcınızda açılacaktır. Lütfen tarayıcıda hesabınıza giriş yapın ve talebinizi oluşturun. İndirme linkiniz e-posta adresinize gelecektir.",
      [{ text: "Anladım ve Devam Et", onPress: initiateExternalLink }]
    );
  };
  
  // Harici linki açan asenkron fonksiyon
  const initiateExternalLink = async () => {
    try {
      const supported = await Linking.canOpenURL(ACCOUNTS_CENTER_DATA_URL);

      if (supported) {
        // Doğrudan Meta Accounts Center URL'sini aç
        await Linking.openURL(ACCOUNTS_CENTER_DATA_URL);
      } else {
        Alert.alert("Hata", `Tarayıcıda bu linki açamıyoruz: ${ACCOUNTS_CENTER_DATA_URL}`);
      }
    } catch (error) {
      console.error("Link açılırken hata oluştu:", error);
      Alert.alert("Hata", "Link açılırken beklenmedik bir sorun oluştu.");
    }
  }

  return (
    // SafeAreaView kaldırıldı, yerine düz View kullanıldı.
    // Güvenli alan boşluğu, styles.container içine Platform'a özel olarak eklendi.
    <View style={styles.container}>
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
          onPress={handleDownload} 
        />

        <Text style={styles.stepTitle}>2. Aşama (Gelecek Özellik)</Text>
        <Text style={styles.description}>
          E-posta ile indirme linkiniz geldiğinde, o linki buraya yapıştırıp verilerinizi işleyeceğiz.
        </Text>
        <View style={styles.buttonSpacing}>
          <Button title="İndirme Linkini Yapıştır" disabled />
        </View>
        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    // iOS'ta çentiğin altından başlaması için manuel boşluk eklenir.
    // Android'de durum çubuğu otomatik olarak yönetildiği için daha az sorun çıkar.
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
  buttonSpacing: {
    marginTop: 15,
    width: '100%',
  },
});