// app/(tabs)/index.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";

export default function HomeScreen() {
  const [link, setLink] = useState("");
  const router = useRouter();

  const handleContinue = () => {
    if (!link || !link.startsWith("http")) {
      Alert.alert("Geçersiz bağlantı", "Lütfen e-postadaki Instagram bağlantısını yapıştır.");
      return;
    }
    router.push({ pathname: "./paste-link", params: { url: link } });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Instagram Veri İndirme</Text>
      <Text style={styles.subtitle}>
        E-posta ile gelen bağlantıyı buraya yapıştır ve “Devam Et” butonuna tıkla.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="https://www.instagram.com/download/request/..."
        value={link}
        onChangeText={setLink}
        autoCapitalize="none"
      />

      <Button title="Devam Et" onPress={handleContinue} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
});
