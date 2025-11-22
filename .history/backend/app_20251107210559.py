import json
from flask import Flask, request, jsonify

# DataProcessor servisini daha sonra buradan import edeceğiz:
# from services.data_processor import DataProcessor 

app = Flask(__name__)

# React Native uygulamamızın çağıracağı ana API rotası
@app.route('/analyze', methods=['POST'])
def analyze_data():
    """
    Frontend'den gelen POST isteğini işler.
    İstek gövdesinden indirme URL'sini alır ve analiz sürecini başlatır.
    """
    
    # 1. İstek Gövdesini Alma
    try:
        data = request.get_json()
    except Exception as e:
        # JSON ayrıştırma hatası
        return jsonify({"status": "error", "message": "Geçersiz JSON formatı"}), 400

    # 2. Kritik URL'yi Kontrol Etme
    download_url = data.get('downloadUrl')
    if not download_url:
        return jsonify({"status": "error", "message": "downloadUrl parametresi eksik."}), 400

    if not download_url.startswith('http'):
        return jsonify({"status": "error", "message": "Geçersiz indirme URL'si."}), 400

    # Hata Ayıklama (Debug) Mesajı
    print(f"[{download_url}] URL'si Backend'e ulaştı. Analiz başlıyor...")

    # Gerçek uygulamada:
    # try:
    #     processor = DataProcessor(download_url)
    #     analysis_results = processor.run_analysis()
    #     
    #     # Başarılı sonuçları döndür
    #     return jsonify({"status": "success", "results": analysis_results}), 200
    # except Exception as e:
    #     # Analiz/İndirme sırasında oluşan hatalar
    #     print(f"Analiz sırasında hata: {e}")
    #     return jsonify({"status": "error", "message": "Analiz sürecinde bir hata oluştu."}), 500

    # Şimdilik, başarılı bir yanıt simülasyonu döndürelim:
    mock_results = {
        "totalPosts": 150,
        "mostLikedPost": "Backend'den gelen deneme gönderisi",
        "averageLikes": 550.0,
        "topFollowerCountry": "Almanya"
    }

    return jsonify({"status": "success", "results": mock_results}), 200


if __name__ == '__main__':
    # Geliştirme ortamında çalıştır
    print("Flask Sunucusu 5000 portunda başlatılıyor...")
    app.run(debug=True, port=5000, host='0.0.0.0')