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

    try:
        # İndirme işlemi
        if not processor.download_file():
            # Temizlik, indirme başarısız olsa bile (yarım kalmış dosya vs.)
            processor.cleanup(keep_extracted=False) 
            return jsonify({"status": "error", "message": "Dosya indirme işlemi başarısız oldu. Link süresi dolmuş veya ağ hatası var."}), 500

        # 3. ZIP Dosyasını Açma
        if not processor.unzip_and_extract():
            # Ayıklama başarısız olursa temizlik yapıp hata döndürelim
            processor.cleanup(keep_extracted=False)
            return jsonify({"status": "error", "message": "ZIP dosyasını açma işlemi başarısız oldu veya dosya bozuk."}), 500
        
        # 4. KRİTİK ADIM: Analiz
        print(f"[{username}]: Veri dosyaları hazır. Analiz başlatılıyor...")
        analysis_results = processor.run_analysis()
        print(f"[{username}]: Analiz tamamlandı.")

        # 5. Başarılı yanıtı döndür
        return jsonify({"status": "success", "results": analysis_results}), 200

    except Exception as e:
        # Genel bir hata olursa temizlik yapıp 500 döndürelim
        print(f"[{username}]: Genel analiz hatası: {e}")
        return jsonify({"status": "error", "message": f"Sunucuda beklenmedik bir hata oluştu: {e}"}), 500

    finally:
        # 6. Her durumda temizliği çalıştır
        # Başarılı analizden sonra bile ZIP dosyasını ve geçici klasörü sil
        processor.cleanup(keep_extracted=False)



if __name__ == '__main__':
    # Geliştirme ortamında çalıştır
    print("Flask Sunucusu 5000 portunda başlatılıyor...")
    app.run(debug=True, port=5000, host='0.0.0.0')