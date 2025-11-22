import React, { useState } from "react";
import { Button, Linking, StyleSheet, Text, TextInput, View } from "react-native";
export default function App() {
  const [username, setUsername] = useState("");
  const handleDownload = () => {
    const url = "https://www.instagram.com/download/request/";
    Linking.openURL(url); 
  }; 
  return (
     <View style={styles.container}> 
     <Text style={styles.title}>Instagram Veri İndirme</Text> 
     <TextInput
      style={styles.input}
      placeholder="Kullanıcı adını gir"
      value={username} 
      onChangeText={setUsername} 
      /> 
      <Button title="Verilerini İndir" onPress={handleDownload} 
      /> 
      </View> 
      ); 
    } 
    const styles = StyleSheet.create({
       container: {
         flex: 1, 
         justifyContent: "center", 
         alignItems: "center", 
         backgroundColor: "#fff", 
         padding: 20, }, 
         title: { 
          fontSize: 22, 
          marginBottom: 20, 
          fontWeight: "bold", 
        }, 
        input: { 
          width: "90%", 
          borderWidth: 1, 
          borderColor: "#ccc", 
          borderRadius: 8, 
          padding: 10, 
          marginBottom: 20, 
        }, });