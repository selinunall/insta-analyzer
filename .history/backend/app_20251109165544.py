import json
from flask import Flask, request, jsonify
from services.data_processor import DataProcessor # YENİ IMPORT
from flask_cors import CORS

app = Flask(__name__)
CORS(app) 

# React Native uygulamamızın çağıracağı ana API rotası
@app.route('/analyze', methods=['POST'])
def analyze_data():
    """
    Frontend'den gelen POST isteğini işler.DataProcessor'ı başlatır.
    """
    # 1. İstek Gövdesini Alma
    try:
        data = request.get_json()
    except Exception as e:
        # JSON ayrıştırma hatası
        return jsonify({"status": "error", "message": "Geçersiz JSON formatı"}), 400

    download_url = data.get('downloadUrl')
    username = data.get('username', 'kullanici') # Opsiyonel kullanıcı adı
    
    if not download_url or not download_url.startswith('http'):
        return jsonify({"status": "error", "message": "Geçersiz indirme URL'si."}), 400

    # Hata Ayıklama (Debug) Mesajı
    print(f"[{download_url}] URL'si Backend'e ulaştı. Analiz başlıyor...")

    # 2. DataProcessor'ı Başlatma ve İndirme
    processor = DataProcessor(download_url=download_url, username=username)

    # İndirme işlemi
    if not processor.download_file():
        return jsonify({"status": "error", "message": "Dosya indirme işlemi başarısız oldu. Link süresi dolmuş veya ağ hatası var."}), 500

    # 3. YENİ: ZIP Dosyasını Açma
    if not processor.unzip_and_extract():
        # Ayıklama başarısız olursa temizlik yapıp hata döndürelim
        processor.cleanup()
        return jsonify({"status": "error", "message": "ZIP dosyasını açma işlemi başarısız oldu."}), 500
    
    # 5. ANALİZİ ÇALIŞTIR
    try:
        analysis_results = processor.run_analysis()  # Yeni analiz fonksiyonumuz
    except Exception as e:
        processor.cleanup()
        return jsonify({
            "status": "error",
            "message": f"Analiz sırasında hata oluştu: {str(e)}"
        }), 500

    # 6. Temizlik (isteğe bağlı)
    processor.cleanup()

    return jsonify({"status": "success", "results": analysis_results}), 200


if __name__ == '__main__':
    # Geliştirme ortamında çalıştır
    print("Flask Sunucusu 5000 portunda başlatılıyor...")
    app.run(debug=True, port=5000, host='0.0.0.0')