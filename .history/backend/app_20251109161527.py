import os
import io
import json
import zipfile
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS # Geliştirme ortamında CORS hatalarını önlemek için

app = Flask(__name__)
# Geliştirme için CORS'u etkinleştirin
CORS(app) 

# Kullanıcının sadece istediği bağlantı (connections) dosyaları.
FILE_MAP = {
    "connections/blocked_profiles.json": "blocked_profiles",
    "connections/following_requests_you've_received.json": "received_follow_requests",
    "connections/followers_1.json": "followers",
    "connections/following.json": "following",
    "connections/hide_story_from.json": "hide_story_from",
    "connections/recent_follow_requests.json": "recent_follow_requests",
    "connections/recently_unfollowed_profiles.json": "recently_unfollowed",
    "connections/restricted_profiles.json": "restricted_profiles",
}

# -----------------------------------------------------------
# Veri Okuma ve İşleme Fonksiyonu
# -----------------------------------------------------------

def extract_usernames_from_profile_list(profile_list: list) -> list:
    """
    Kullanıcının verdiği örnek formata uygun olarak (string_list_data altındaki value)
    profil listesinden sadece kullanıcı adlarını (username) çıkarır.
    """
    usernames = []
    for item in profile_list:
        if isinstance(item, dict) and 'string_list_data' in item:
            try:
                # Kullanıcı adının listenin ilk elemanının 'value' anahtarında olduğunu varsayıyoruz
                username_val = item['string_list_data'][0]['value']
                usernames.append(username_val)
            except (IndexError, KeyError):
                # JSON yapısı beklenenden farklıysa bu profili atla
                continue
    return usernames


def read_zip_data(zip_file_content: bytes) -> dict:
    """ZIP dosyasından belirtilen JSON dosyalarını okur ve verileri sözlükte tutar."""
    all_data = {}
    
    with zipfile.ZipFile(io.BytesIO(zip_file_content), 'r') as zf:
        
        def find_and_read(base_name, data_key):
            # Olası yollar listesi: Standart yol, "instagram_data/" ön eki ve followers_and_following alt klasörü
            possible_paths = [
                base_name,
                "instagram_data/" + base_name, 
                base_name.replace("connections/", "connections/followers_and_following/"),
            ]
            
            for path in possible_paths:
                try:
                    with zf.open(path) as file:
                        print(f"Başarıyla okundu: {path}")
                        raw_content = file.read().decode('utf-8')
                        content = json.loads(raw_content)
                        
                        if data_key in ["followers", "following"]:
                            # Bu dosyalar için özel kullanıcı adı çıkarma mantığını uygula
                            profile_list = list(content.values())[0] if isinstance(content, dict) and content.values() else []
                            
                            # Basit kullanıcı adı listesini kaydet
                            all_data[data_key + "_usernames"] = extract_usernames_from_profile_list(profile_list)
                            
                            # Ham listeyi de sayım için tutabiliriz (şimdilik sadece kullanıcı adları listesini kullanacağız)
                            # all_data[data_key] = profile_list 

                        elif isinstance(content, list):
                            # blocked_profiles, restricted_profiles vb. gibi doğrudan liste dönenler
                            all_data[data_key] = content
                        
                        elif isinstance(content, dict):
                             # Diğer sözlük dönen dosyalar için
                            all_data[data_key] = content
                        
                        return True
                
                except KeyError:
                    continue # Bu yolu atla
                except Exception as e:
                    print(f"Hata: {path} okunurken veya ayrıştırılırken hata oluştu: {e}")
                    continue
            
            print(f"Uyarı: '{data_key}' için dosya bulunamadı veya okunamadı.")
            return False

        # Haritadaki tüm dosyaları okumayı dene
        for file_path, data_key in FILE_MAP.items():
            find_and_read(file_path, data_key)

    return all_data

# -----------------------------------------------------------
# Basit Analiz Fonksiyonu
# -----------------------------------------------------------

def perform_analysis(raw_data: dict, username: str) -> dict:
    """Okunan veriler üzerinden analiz yapar ve kullanıcı adı listelerini döndürür."""

    followers_usernames = raw_data.get('followers_usernames', [])
    following_usernames = raw_data.get('following_usernames', [])

    # 1. Temel Sayımlar
    total_followers = len(followers_usernames)
    total_following = len(following_usernames)
    
    # 2. Engellenen ve Kısıtlanan Profiller (Bu veriler genellikle doğrudan listelerdir)
    blocked_count = len(raw_data.get('blocked_profiles', []))
    restricted_count = len(raw_data.get('restricted_profiles', []))
    
    # Hikayesi Gizlenenler
    hide_story_from_count = len(raw_data.get('hide_story_from', []))
    
    return {
        "user_analyzed": username,
        "total_followers": total_followers,
        "total_following": total_following,
        "follower_to_following_ratio": total_followers / max(total_following, 1) if total_following > 0 else total_followers,
        "blocked_profiles_count": blocked_count,
        "restricted_profiles_count": restricted_count,
        "hide_story_from_count": hide_story_from_count,
        
        # Kullanıcı adı listelerini ekliyoruz (Frontend'de göstermek için)
        "followers_usernames": followers_usernames,
        "following_usernames": following_usernames,
    }

# -----------------------------------------------------------
# API Rotası
# -----------------------------------------------------------

@app.route('/analyze', methods=['POST'])
def analyze_data():
    """Gelen indirme URL'sini işler ve analiz sonuçlarını döndürür."""
    try:
        data = request.json
        download_url = data.get('downloadUrl')
        username = data.get('username', 'Bilinmiyor')

        if not download_url:
            return jsonify({
                "status": "error",
                "message": "downloadUrl sağlanmalıdır."
            }), 400

        print(f"İndirme başlatılıyor: {download_url}")
        
        # 1. ZIP Dosyasını İndir
        response = requests.get(download_url, stream=True)
        response.raise_for_status()
        
        zip_bytes = response.content

        # 2. ZIP İçeriğini Oku ve JSON Verilerini Çıkar
        raw_data = read_zip_data(zip_bytes)
        
        # 3. Analizi Gerçekleştir
        analysis_results = perform_analysis(raw_data, username)
        
        print("Analiz Başarılı. Sonuçlar döndürülüyor.")
        
        return jsonify({
            "status": "success",
            "results": analysis_results
        })

    except requests.exceptions.HTTPError as e:
        return jsonify({
            "status": "error",
            "message": f"İndirme URL'sinde HTTP Hatası oluştu: {e}"
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Beklenmedik bir hata oluştu: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)