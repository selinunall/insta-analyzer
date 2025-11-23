import json
from flask import Flask, request, jsonify
from .services.data_processor import DataProcessor 
from flask_cors import CORS

app = Flask(__name__)
CORS(app) 

# React Native uygulamamızın çağıracağı ana API rotası
@app.route('/', methods=['POST'])
def analyze_data():
    """
    Frontend'den gelen POST isteğini işler.DataProcessor'ı başlatır.
    """
    processor = None # Temizlik için erişilebilir olmalı
    # 1. İstek Gövdesini Alma
    try:
        data = request.get_json()
    except Exception as e:
        # JSON ayrıştırma hatası
        return jsonify({"status": "error", "message": "Geçersiz JSON formatı"}), 400

    download_url = data.get('downloadUrl')
    username = data.get('username') # Opsiyonel kullanıcı adı
    
    if not download_url or not download_url.startswith('http'):
        return jsonify({"status": "error", "message": "Geçersiz indirme URL'si."}), 400

    # Hata Ayıklama (Debug) Mesajı
    print(f"[{download_url}] URL'si Backend'e ulaştı. Analiz başlıyor...")

    # 2. DataProcessor'ı Başlatma ve İndirme
    processor = DataProcessor(download_url=download_url, username=username)

    # İndirme işlemi
    if not processor.download_file():
        #processor.cleanup()  # İndirme başarısızsa temizleme yap
        return jsonify({"status": "error", "message": "Dosya indirme işlemi başarısız oldu. Link süresi dolmuş veya ağ hatası var."}), 500

    #zip açma
    if not processor.unzip_and_extract():
        processor.cleanup(keep_extracted=False)#hata varsa açılan dosyaları sil
        return jsonify({"status": "error", "message": "ZIP dosyasını açma işlemi başarısız oldu veya dosya bozuk."}), 500   
 
    # 3. Analiz İşlemini Başlatma (YENİ EKLEME)
    try:
        results = processor.run_analysis()
    except Exception as e:
        print(f"Analiz sırasında beklenmedik hata oluştu: {e}")
        processor.cleanup()
        return jsonify({"status": "error", "message": f"Analiz sırasında hata oluştu: {e}"}), 500

    # 4. Temizlik İşlemi (Başarılı analizden sonra dosyaları sil)
    processor.cleanup()

    return jsonify({"status": "success", "results": results}), 200


if __name__ == '__main__':
    # Geliştirme ortamında çalıştır
    print("Flask Sunucusu 5000 portunda başlatılıyor...")
    app.run(debug=True, port=5000, host='0.0.0.0')