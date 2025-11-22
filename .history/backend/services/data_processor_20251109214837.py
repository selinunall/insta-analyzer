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
        """Belirtilen göreceli yoldaki JSON dosyasını yükler ve ana listeyi döndürür."""
        full_path = os.path.join(self.extraction_path, relative_path)
        if not os.path.exists(full_path):
            print(f"[{self.username}]: Uyarı: Dosya bulunamadı: {relative_path}")
            return []
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                # FOLLOWING.JSON için: relationships_following anahtarını kontrol et
                if 'relationships_following' in data:
                    print(f"[{self.username}]: '{relative_path}' 'relationships_following' formatında okundu.")
                    return data['relationships_following']
                
                # FOLLOWERS_1.JSON için: followers_? anahtarını kontrol et (genel durum)
                elif isinstance(data, dict) and data:
                    # Genellikle ilk anahtar, listenin adıdır ('followers_1' veya 'relationships_followers')
                    key = list(data.keys())[0]
                    print(f"[{self.username}]: '{relative_path}' '{key}' formatında okundu.")
                    return data[key]
                
                # Düz liste formatı (Nadir)
                elif isinstance(data, list):
                    print(f"[{self.username}]: '{relative_path}' düz liste formatında okundu.")
                    return data

                return []
        except Exception as e:
            print(f"[{self.username}]: Hata: JSON okunamadı ({relative_path}): {e}")
            return []

    def run_analysis(self) -> dict:
        """
        Çıkarılan JSON dosyaları üzerinde basit takipçi/takip analizi yapar.
        """
        print(f"[{self.username}]: Takipçi/Takip Analizi başlatılıyor...")
        
        # 1. Verileri Yükle
        # NOT: 'followers_1.json' da aynı karmaşık formatta olabilir, bu yüzden _load_json_data yardımcı olur.
        followers_data = self._load_json_data('followers_and_following/followers_1.json')
        following_data = self._load_json_data('followers_and_following/following.json')
        
        # 2. Kullanıcı Adlarını Çıkartma ve Set Oluşturma
        
        # Takipçiler: title alanı (kullanıcı adı) üzerinden set oluştur
        # Takipçi listesi: [{'title': 'username', 'string_list_data': [...]}, ...] formatında
        followers_list = {item.get('title') for item in followers_data if item.get('title')}
        
        # Takip Edilenler: title alanı (kullanıcı adı) üzerinden set oluştur
        following_list = {item.get('title') for item in following_data if item.get('title')}

        # 3. Toplam Sayıları Hesapla
        total_followers = len(followers_list)
        total_following = len(following_list)

        # 4. Karşılıklı Takip Etmeyenleri Bul (Unfollowers/Not Following Back)
        # Sizin takip edip (following), onların sizi takip etmediği (followers) kişiler
        not_following_back = following_list - followers_list
        
        unfollowers_count = len(not_following_back)
        top_unfollower = next(iter(not_following_back), "Yok")
        
        # 5. Sonuçları Hazırla (Frontend'deki arayüze uyması için alan isimlerini kullanıyoruz)
        self.analysis_results = {
            "TakipçiSayısı": total_followers, 
            "TakipEdilenSayısı": total_following, 
            "GeriTakipEtmeyenSayısı": f"GT Yapmayan Sayısı: {unfollowers_count}", 
            "İlkGeriTakipEtmeyen": f"İlk GT Yapmayan: {top_unfollower}" 
        }
        
        print(f"[{self.username}]: Analiz Tamamlandı. Takipçi: {total_followers}, Takip Edilen: {total_following}, GT Yapmayan: {unfollowers_count}")
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