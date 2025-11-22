import requests
import os
import shutil
import json
from zipfile import ZipFile

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')

if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

class DataProcessor:
    def __init__(self, download_url: str, username: str = "user"):
        self.download_url = download_url
        self.username = username
        self.zip_filename = f"{self.username}_instagram_data.zip"
        self.zip_path = os.path.join(DATA_DIR, self.zip_filename)
        self.extraction_path = os.path.join(DATA_DIR, f"{self.username}_extracted_data")
        
        self.analysis_results = {}

    def download_file(self) -> bool:

        print(f"[{self.username}]: İndirme işlemi başlatılıyor: {self.download_url[:50]}...")
        
        # 4 MB (1024 * 4) bloklar halinde indirme
        chunk_size = 1024 * 4
        try:
            # stream=True ile büyük dosyaları bellek dostu bir şekilde indiriyoruz
            with requests.get(self.download_url, stream=True) as r:
                r.raise_for_status() # HTTP hatalarını yakalar (4xx veya 5xx)
                
                # İndirilecek dosya boyutunu al (opsiyonel)
                total_size = int(r.headers.get('content-length', 0))
                downloaded_size = 0
                
                with open(self.zip_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=chunk_size): 
                        if chunk: # boş chunk'ları filtrele
                            f.write(chunk)
                            downloaded_size += len(chunk)
                            # İlerleme çubuğu simülasyonu için log (opsiyonel)
                            # print(f"İndiriliyor: {downloaded_size / total_size * 100:.2f}%", end='\r')
                            
            print(f"[{self.username}]: Dosya başarıyla indirildi: {self.zip_path}")
            return True
            
        except requests.exceptions.RequestException as e:
            print(f"[{self.username}]: İndirme sırasında ağ hatası oluştu: {e}")
            return False
        except Exception as e:
            print(f"[{self.username}]: Beklenmedik hata: {e}")
            return False

    def unzip_and_extract(self) -> bool:

        print(f"[{self.username}]: ZIP dosyasını açma işlemi başlatılıyor...")
        # Daha önce açılmış klasör varsa temizle (önemli)
        if os.path.exists(self.extraction_path):
            shutil.rmtree(self.extraction_path)
            print(f"[{self.username}]: Eski ayıklama klasörü temizlendi.")

        try:
            with ZipFile(self.zip_path, 'r') as zip_ref:
                # Dosyaları extraction_path dizinine çıkar
                zip_ref.extractall(self.extraction_path)
            
            print(f"[{self.username}]: ZIP dosyası başarıyla açıldı: {self.extraction_path}")
            return True

        except FileNotFoundError:
            print(f"[{self.username}]: Hata: ZIP dosyası bulunamadı: {self.zip_path}")
            return False
        except Exception as e:
            print(f"[{self.username}]: Ayıklama sırasında beklenmedik hata: {e}")
            return False

    def _load_json_data(self, relative_path: str) -> list:

        # 1. Doğrudan Yolu Dene (connections/followers_and_following/...)
        full_path = os.path.join(self.extraction_path, relative_path)
        found_path = None

        if os.path.exists(full_path):
            found_path = full_path

        # 2. Esnek Yolu Dene (Tarihli ana klasör)
        if not found_path:
            content_list = os.listdir(self.extraction_path)
            sub_dirs = [d for d in content_list if os.path.isdir(os.path.join(self.extraction_path, d))]

            if len(sub_dirs) == 1:
                single_sub_dir = sub_dirs[0]
                potential_path = os.path.join(self.extraction_path, single_sub_dir, relative_path)
                
                if os.path.exists(potential_path):
                    found_path = potential_path
                    print(f"[{self.username}]: KRİTİK BAŞARI: Dosya '{single_sub_dir}' alt klasöründe bulundu.")
                
        # 3. Klasör Adlarının Duyarlılığını Dene (Örneğin 'Connections' yerine 'connections' olması)
        # Eğer hala bulunamadıysa, klasör adlarının küçük harfli olduğunu varsayarak dene.
        if not found_path:
            parts = relative_path.split('/')
            lower_case_path = '/'.join([p.lower() for p in parts])
            lower_case_full_path = os.path.join(self.extraction_path, lower_case_path)

            if os.path.exists(lower_case_full_path):
                 found_path = lower_case_full_path
                 print(f"[{self.username}]: KRİTİK BAŞARI: Dosya küçük harfli yolda bulundu: {lower_case_path}")

        if not found_path:
            print(f"[{self.username}]: Uyarı: Dosya bulunamadı: {relative_path}")
            return []
        
        # 4. JSON Okuma ve Veri Çıkarma (Önceki mantık)
        try:
            with open(found_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data
        except Exception as e:
            print(f"[{self.username}]: Hata: JSON okunamadı ({found_path}): {e}")
            return []


    def _extract_users_from_title(self, raw_data, main_key: str) -> set:
        """Tip 1 Formatı: Veri, main_key altında listedir ve kullanıcı adı 'title' alanındadır."""
        if main_key in raw_data:
            data_list = raw_data.get(main_key, [])
            return {item.get('title') for item in data_list if item.get('title')}
        return set()
        
    def _extract_users_from_value(self, raw_data) -> set:
        """Tip 2 Formatı: Veri 'string_list_data' altında listelenir ve kullanıcı adı 'value' alanındadır."""
        if 'string_list_data' in raw_data:
            data_list = raw_data.get('string_list_data', [])
            return {item.get('value') for item in data_list if item.get('value')}
        return set()
    
    def _extract_users_from_embedded_list(self, raw_data, main_key: str) -> set:
        """
        YENİ Tip 3 Formatı: Veri, main_key altında bir listedir ve 
        kullanıcı adları bu listenin ilk elemanı içindeki 'string_list_data' altındadır.
        (Örn: accepted_requests)
        """
        if main_key in raw_data:
            outer_list = raw_data.get(main_key, [])
            if outer_list and isinstance(outer_list, list) and 'string_list_data' in outer_list[0]:
                data_list = outer_list[0].get('string_list_data', [])
                return {item.get('value') for item in data_list if item.get('value')}
        return set()
    
    def _extract_users_from_top_level_list(self, raw_data: list) -> set:
        """
        Tip 4 Formatı: Veri, doğrudan bir üst seviye listedir.
        Kullanıcı adı her liste öğesinin içindeki string_list_data[0]['value'] alanındadır.
        (Örn: followers_1.json, recently_unfollowed_profiles.json)
        """
        users = set()
        if isinstance(raw_data, list):
            for item in raw_data:
                string_data_list = item.get('string_list_data', [])
                if string_data_list and isinstance(string_data_list, list):
                    # Genellikle sadece ilk eleman (index 0) kullanıcı adını içerir
                    user_value = string_data_list[0].get('value')
                    if user_value:
                        users.add(user_value)
        return users

    def _extract_users_from_key_and_value(self, raw_data: dict, main_key: str) -> set:
        """
        Tip 5 Formatı: Veri, main_key altındaki listedir.
        Kullanıcı adı her liste öğesinin içindeki string_list_data[0]['value'] alanındadır.
        (Örn: hide_story_from.json, accepted_requests.json, received_requests.json)
        """
        users = set()
        if main_key in raw_data:
            outer_list = raw_data.get(main_key, [])
            if isinstance(outer_list, list):
                for item in outer_list:
                    string_data_list = item.get('string_list_data', [])
                    if string_data_list and isinstance(string_data_list, list):
                        # Kullanıcı adı 'value' alanında
                        user_value = string_data_list[0].get('value')
                        if user_value:
                            users.add(user_value)
        return users


    def _get_ordered_user_list(self, raw_data: list) -> list:
        """
        Tip 4 Formatındaki (followers_1.json) veriyi sıralı bir kullanıcı adı listesi olarak döndürür.
        """
        users = []
        if isinstance(raw_data, list):
            for item in raw_data:
                string_data_list = item.get('string_list_data', [])
                if string_data_list and isinstance(string_data_list, list):
                    user_value = string_data_list[0].get('value')
                    if user_value:
                        # Burada listenin sıralamasını koruyoruz
                        users.append(user_value)
        return users
    
    def run_analysis(self) -> dict:

        print(f"[{self.username}]: Kapsamlı Takip Analizi başlatılıyor...")
        
        FILE_PATH_PREFIX = 'connections/followers_and_following/'

        # 1. TÜM VERİLERİ YÜKLE
        data = {
            'followers': self._load_json_data(FILE_PATH_PREFIX + 'followers_1.json'),
            'following': self._load_json_data(FILE_PATH_PREFIX + 'following.json'),
            'blocked': self._load_json_data(FILE_PATH_PREFIX + 'blocked_profiles.json'),
            'unfollowed': self._load_json_data(FILE_PATH_PREFIX + 'recently_unfollowed_profiles.json'),
            'accepted_requests': self._load_json_data(FILE_PATH_PREFIX + 'recent_follow_requests.json'), 
            'received_requests': self._load_json_data(FILE_PATH_PREFIX + 'follow_requests_you\'ve_received.json'),
            'hide_story_from': self._load_json_data(FILE_PATH_PREFIX + 'hide_story_from.json'),
            'pending_requests': self._load_json_data(FILE_PATH_PREFIX + 'pending_follow_requests.json'),
            'restricted_profiles': self._load_json_data(FILE_PATH_PREFIX + 'restricted_profiles.json'),
            # 'following_requests_you\'ve_received.json' ve 'hide_story_from.json' tip 2 formatında varsayılmıştır.
        }

        # 2. TÜM LİSTELERİ ÇIKAR
        
        # Tip 2 Formatları (string_list_data / value):
        followers_list = self._extract_users_from_top_level_list(data['followers'])
        recently_unfollowed_list = self._extract_users_from_key_and_value(data['unfollowed'],'relationships_unfollowed_users')
        
        received_requests_list = self._extract_users_from_value(data['received_requests'])
        
        #tip 5
        hide_story_list = self._extract_users_from_key_and_value(
            data['hide_story_from'], 
            'relationships_hide_stories_from'
        )
        accepted_requests_list = self._extract_users_from_key_and_value(
            data['accepted_requests'],
            'relationships_permanent_follow_requests'
            )
        
        
        # Tip 1 Formatları (relations / title):
        following_list = self._extract_users_from_title(data['following'], 'relationships_following')
        blocked_list = self._extract_users_from_title(data['blocked'], 'relationships_blocked_users')
        # YENİ ÇIKARILAN LİSTELER (Tip 3 Formatı)
        pending_requests_list = self._extract_users_from_key_and_value(
            data['pending_requests'], 
            'relationships_follow_requests_sent' # pending_follow_requests.json anahtarı
        )
        restricted_profiles_list = self._extract_users_from_embedded_list(
            data['restricted_profiles'], 
            'relationships_restricted_users' # restricted_profiles.json anahtarı
        )

        # Yeni Takipçiler Analizi için sıralı listeyi al
        ordered_followers_list = self._get_ordered_user_list(data['followers'])
        # 'YENİ TAKİPÇİLER' ANALİZİ (Testinize göre ilk 50'yi en son takipçiler kabul ediyoruz)
        NEW_FOLLOWER_COUNT_LIMIT = 15
        recent_followers_list = ordered_followers_list[:NEW_FOLLOWER_COUNT_LIMIT]

        # 3. KAPSAMLI ANALİZLERİ YAP
        total_followers = len(followers_list)
        total_following = len(following_list)
        
        mutual_following = followers_list.intersection(following_list)
        not_following_back = following_list - followers_list # Sizin takip edip, onların etmediği (GT Yapmayan)
        you_not_following = followers_list - following_list # Onların takip edip, sizin etmediğiniz (Sizin GT yapmadığınız)
        
        # 4. SONUÇLARI HAZIRLA (7 Metrik)
        analysis_metrics = {
            "total_followers": total_followers,
            "total_following": total_following,
            
            # 7 Frontend Alanı için metrikler
            "unfollowed_count": len(recently_unfollowed_list),           # 1. Son zamanlarda takipten çıkanlar (Sizin bıraktıklarınız)
            "not_following_back_count": len(not_following_back),        # 2. Geri takip etmeyenlerin sayısı
            "mutual_following_count": len(mutual_following),            # 3. Karşılıklı takip sayısı
            "you_not_following_count": len(you_not_following),          # 4. Geri takip etmediklerinizin sayısı
            "blocked_count": len(blocked_list),                         # 5. Engellediklerimin sayısı
            "hide_story_count": len(hide_story_list),                   # 6. Hikayemi gizlediklerimin sayısı
            "accepted_requests_count": len(accepted_requests_list),     # 7. Kabul ettiğim takip isteklerinin sayısı
            # "received_requests_count": len(received_requests_list),    # Ekstra bilgi
            # YENİ EKLENEN METRİKLER
            "pending_requests_count": len(pending_requests_list),       # Bekleyen takip isteklerinin sayısı 
            "restricted_profiles_count": len(restricted_profiles_list),  # Kısıtladığınız profillerin sayısı
            "recent_followers_count": len(recent_followers_list), # Yeni takipçilerin sayısı
        }
        # LİSTE SONUÇLARI (Pop-up'larda gösterilecek veriler)
        analysis_user_lists = {
            # Set'leri listeye çevirip JSON'a hazırla
            "not_following_back_list": sorted(list(not_following_back)), 
            "mutual_following_list": sorted(list(mutual_following)), 
            "you_not_following_list": sorted(list(you_not_following)), 
            "unfollowed_list": sorted(list(recently_unfollowed_list)), 
            "blocked_list": sorted(list(blocked_list)),
            "hide_story_list": sorted(list(hide_story_list)),
            "accepted_requests_list": sorted(list(accepted_requests_list)),
            "pending_requests_list": sorted(list(pending_requests_list)), 
            "restricted_profiles_list": sorted(list(restricted_profiles_list)), 
            "recent_followers_list": recent_followers_list, # Sıralı liste
        }
        
        # 5. Frontend'e Gönderilecek Formatı Ayarla (analysisResults tipine uydur)
        self.analysis_results = {
            "all_metrics": analysis_metrics,
            "user_lists": analysis_user_lists # Kullanıcı Adı Listeleri
        }
        
        print(f"[{self.username}]: Kapsamlı Analiz Tamamlandı. GT Yapmayan: {analysis_metrics['not_following_back_count']}, Takibi Bırakılan: {analysis_metrics['unfollowed_count']}")
        return self.analysis_results
    
    def cleanup(self):
        """
        İndirilen ZIP dosyasını ve çıkarılan klasörü temizler.
        """
        # Burada os.remove ve shutil.rmtree kullanılacak.
        print(f"[{self.username}]: Temizlik işlemi başlıyor...")
        # ZIP dosyasını sil
        if os.path.exists(self.zip_path):
            os.remove(self.zip_path)
            print(f"[{self.username}]: ZIP dosyası silindi.")
        
        # Çıkarılan klasörü sil
        if os.path.exists(self.extraction_path):
            shutil.rmtree(self.extraction_path)
            print(f"[{self.username}]: Ayıklanan klasör silindi.")
        
        print(f"[{self.username}]: Temizlik tamamlandı.")
        # Temizlik şu an 'app.py' içinde çağrılmıyor. İsteğe bağlı olarak eklenebilir.