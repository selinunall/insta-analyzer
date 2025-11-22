import React, { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { WebView } from "react-native-webview";

export default function App() {
  const [username, setUsername] = useState("");
  const [showWebView, setShowWebView] = useState(false);

  const handleDownload = () => {
    setShowWebView(true);
  };

  return (
    <View style={styles.container}>
      {!showWebView ? (
        <>
          <Text style={styles.title}>Instagram Veri İndirme</Text>
          <TextInput
            style={styles.input}
            placeholder="Kullanıcı adını gir"
            value={username}
            onChangeText={setUsername}
          />
          <Button title="Verilerini İndir" onPress={handleDownload} />
        </>
      ) : (
        <WebView
          source={{ uri: "https://www.instagram.com/download/request/" }}
          style={{
            width: "90%",         // ekranın %90'ı kadar genişlik
            height: "70%",        // ekranın %70'i kadar yükseklik
            borderRadius: 12,     // kenarları yuvarlatmak istersen
            overflow: "hidden",   // taşmaları gizler
          }}
          startInLoadingState
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    marginBottom: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  input: {
    width: "90%",
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  webview: {
    flex: 1,
  },
});
