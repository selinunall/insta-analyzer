import requests
import os
import shutil
import json
from zipfile import ZipFile

# İndirilen ZIP dosyasını ve çıkarılan verileri tutacağımız dizin
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')

# Eğer data klasörü yoksa oluştur
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

class DataProcessor:
    """
    Instagram indirme linkini işlemek, dosyayı indirmek, açmak ve analiz etmek
    için merkezi sınıf.
    """
    def __init__(self, download_url: str, username: str = "user"):
        self.download_url = download_url
        self.username = username
        # İndirilen dosyanın adını kullanıcı adına ve anlık zamana göre belirleyebiliriz,
        # ancak basitlik için şimdilik sabit bir isim verelim.
        self.zip_filename = f"{self.username}_instagram_data.zip"
        self.zip_path = os.path.join(DATA_DIR, self.zip_filename)
        self.extraction_path = os.path.join(DATA_DIR, f"{self.username}_extracted_data")
        
        # Analiz sonuçlarını tutacak dictionary
        self.analysis_results = {}

    def download_file(self) -> bool:
        """
        URL'den büyük ZIP dosyasını DATA_DIR'a indirir. 
        Başarılı olursa True, hata oluşursa False döndürür.
        """
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

    # ----------------------------------------------------
    # SONRAKİ ADIMLAR İÇİN YER TUTUCULAR
    # ----------------------------------------------------
    
    def unzip_and_extract(self) -> bool:
        """
        İndirilen ZIP dosyasını açar.
        """
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
        """
        Belirtilen göreceli yoldaki JSON dosyasını yükler.
        Çıkarılan dizinin (self.extraction_path) hemen altında
        bir tarihli alt klasör olup olmadığını kontrol eder.
        """
        
        # 1. Doğrudan Yolu Dene (connections/followers_and_following/...)
        full_path = os.path.join(self.extraction_path, relative_path)
        found_path = None

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

    def _extract_users(self, raw_data, main_key: str, user_key: str) -> set:
        """Belirtilen anahtar ve kullanıcı adı anahtarını kullanarak kullanıcı adlarını çıkarır."""
        user_list = set()
        if main_key in raw_data:
            data_list = raw_data.get(main_key, [])
            user_list = {item.get(user_key) for item in data_list if item.get(user_key)}
        return user_list
        
    def _extract_users_from_string_list(self, raw_data) -> set:
        """Tip 2 formatından (string_list_data altında value) kullanıcıları çıkarır."""
        if 'string_list_data' in raw_data:
            data_list = raw_data.get('string_list_data', [])
            return {item.get('value') for item in data_list if item.get('value')}
        return set()


    def run_analysis(self) -> dict:
        """
        Çıkarılan JSON dosyaları üzerinde basit takipçi/takip analizi yapar.
        """
        print(f"[{self.username}]: Takipçi/Takip Analizi başlatılıyor...")
        
        data = {
            'followers': self._load_json_data(FILE_PATH_PREFIX + 'followers_1.json'),
            'following': self._load_json_data(FILE_PATH_PREFIX + 'following.json'),
            'blocked': self._load_json_data(FILE_PATH_PREFIX + 'blocked_profiles.json'),
            'unfollowed': self._load_json_data(FILE_PATH_PREFIX + 'recently_unfollowed_profiles.json'),
            'accepted_requests': self._load_json_data(FILE_PATH_PREFIX + 'recent_follow_requests.json'), # Düzeltildi
            # Diğer dosyalar (şimdilik sadece sayıları lazım)
            'following_requests_received': self._load_json_data(FILE_PATH_PREFIX + 'following_requests_you\'ve_received.json'),
            'hide_story_from': self._load_json_data(FILE_PATH_PREFIX + 'hide_story_from.json'),
        }
        
        # 2. TÜM LİSTELERİ ÇIKAR (Formatlara Göre Ayırarak)
        
        # Tip 2 Formatları (string_list_data / value):
        followers_list = self._extract_users_from_string_list(data['followers'])
        recently_unfollowed_list = self._extract_users_from_string_list(data['unfollowed'])
        accepted_requests_list = self._extract_users_from_string_list(data['accepted_requests'])
        
        # Tip 1 Formatları (relations / title):
        following_list = self._extract_users(data['following'], 'relationships_following', 'title')
        blocked_list = self._extract_users(data['blocked'], 'relationships_blocked_users', 'title')

        # Diğerlerinin Sayıları (Tipik olarak string_list_data altında value veya ilişkiler altında title gelir)
        # Eğer bu dosyaların içeriği farklı formatta gelirse, burası hatalı sonuç verebilir.
        # En basit Tip 2 formatını varsayalım:
        received_requests_list = self._extract_users_from_string_list(data['following_requests_received'])
        hide_story_list = self._extract_users_from_string_list(data['hide_story_from'])


        # 3. KAPSAMLI ANALİZLERİ YAP
        
        # Temel Takip Analizi
        mutual_following = followers_list.intersection(following_list)
        not_following_back = following_list - followers_list # Sizin takip edip, onların etmediği
        you_not_following = followers_list - following_list # Onların takip edip, sizin etmediğiniz

        # 4. SONUÇLARI HAZIRLA (Yeni Metrikler)
        analysis_metrics = {
            "total_followers": len(followers_list), # Sadece bilgilendirme için
            "total_following": len(following_list), # Sadece bilgilendirme için
            
            "new_followers_count": 0, # Bu veri (followers_1.json'dan fark) için ek zaman damgası analizi gerekir. Şimdilik 0 bırakalım.
            "unfollowed_count": len(recently_unfollowed_list), # Son zamanlarda takibi bıraktıklarım
            "not_following_back_count": len(not_following_back), # Geri takip etmeyenler
            "you_not_following_count": len(you_not_following), # Geri takip etmedikleriniz
            "mutual_following_count": len(mutual_following), # Karşılıklı takip
            "blocked_count": len(blocked_list), # Engellediklerim
            "hide_story_count": len(hide_story_list), # Hikayemi gizlediklerim
            "accepted_requests_count": len(accepted_requests_list), # Kabul ettiğim takip istekleri
            "received_requests_count": len(received_requests_list), # Gelen takip istekleri (pending/received)
        }
        
        # Not: Frontend'de 4 alanımız var. Bu alanlara tüm verileri sığdırmamız gerekiyor.
        # totalPosts, averageLikes, mostLikedPost, topFollowerCountry
        
        # Yeni Düzene Geçiş (Frontend'e Uyumlu Çıktı)
        self.analysis_results = {
            # Yeni Sayı 1: Takip Bırakma İstatistikleri
            "totalPosts": analysis_metrics['unfollowed_count'], 
            # Yeni Sayı 2: Geri Takip İstatistikleri
            "averageLikes": analysis_metrics['not_following_back_count'], 
            # Yeni Sayı 3: Güvenlik/İstekler (Mesaj olarak birden fazla bilgiyi taşıyalım)
            "mostLikedPost": f"Engellenen: {analysis_metrics['blocked_count']}, Hikaye Gizlenen: {analysis_metrics['hide_story_count']}",
            # Yeni Sayı 4: Özet Metrikler (Mesaj olarak birden fazla bilgiyi taşıyalım)
            "topFollowerCountry": f"Karşılıklı: {analysis_metrics['mutual_following_count']}, T.İsteği Kabul: {analysis_metrics['accepted_requests_count']}",
            
            # Tüm metrikleri ekstra bir anahtarda da saklayalım (ileride kolaylık sağlar)
            "all_metrics": analysis_metrics 
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