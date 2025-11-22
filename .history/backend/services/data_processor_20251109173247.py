import requests
import os
import shutil
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


    def run_analysis(self) -> dict:
        """
        Çıkarılan JSON dosyaları üzerinde analiz yapar ve sonuçları döndürür.
        """
        # Analiz mantığı burada çalışacak.
        print(f"[{self.username}]: Analiz işlemi bekleniyor...")
        self.analysis_results = {
            "totalPosts": 0, # Mock değer
            "mostLikedPost": "Analiz henüz yapılmadı",
            "averageLikes": 0.0,
            "topFollowerCountry": "Bilinmiyor"
        }
        return self.analysis_results
    
    def cleanup(self):
        """
        İndirilen ZIP dosyasını ve çıkarılan klasörü temizler.
        """
        # Burada os.remove ve shutil.rmtree kullanılacak.
        print(f"[{self.username}]: Temizlik işlemi bekleniyor...")