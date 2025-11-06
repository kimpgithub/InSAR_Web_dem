# InSAR Web Visualization Platform

InSAR (Interferometric Synthetic Aperture Radar) 분석 결과와 Sentinel-1 데이터를 웹 기반으로 시각화하는 플랫폼입니다.

## 🎯 주요 기능

- **Sentinel-1 데이터 목록** - 왼쪽 사이드바에 처리된 씬 목록 표시
- **인터랙티브 지도** - OpenStreetMap 기반 지도에 InSAR 포인트 시각화
- **시계열 그래프** - 포인트 클릭 시 변위량 시계열 그래프 팝업
- **검색 및 필터링** - 날짜/ID로 Sentinel-1 데이터 검색

## 📁 프로젝트 구조

```
InSAR_Web_dem/
├── index.html              # 메인 HTML 페이지
├── css/
│   └── main.css           # 스타일시트
├── js/
│   ├── main.js            # 앱 초기화 및 상태 관리
│   ├── map.js             # 지도 및 InSAR 시각화
│   ├── sidebar.js         # Sentinel-1 목록 표시
│   └── chart.js           # 시계열 그래프
├── data/
│   ├── raw/               # 원본 데이터 (.nc, .SAFE)
│   └── processed/         # 처리된 데이터 (JSON, GeoJSON)
│       ├── sentinel_list.json
│       └── subsidence_filtered_subsidence_points.geojson
├── images/
│   └── thumbnails/        # Sentinel-1 썸네일 (optional)
├── scripts/               # 데이터 전처리 스크립트
│   ├── nc_to_geojson.py
│   └── extract_sentinel_metadata.py
├── PRD.md                 # 프로젝트 요구사항 문서
└── requirements.txt       # Python 의존성
```

## 🚀 빠른 시작

### 1. 데이터 준비

#### InSAR 데이터
기존 GeoJSON 파일을 `data/processed/` 폴더에 복사:
```bash
cp subsidence_filtered_subsidence_points.geojson data/processed/
```

#### Sentinel-1 메타데이터 추출 (optional)
```bash
# Python 환경 설정
pip install -r requirements.txt

# .SAFE 폴더에서 메타데이터 추출
python scripts/extract_sentinel_metadata.py <.SAFE 폴더 디렉토리> --batch
```

### 2. 로컬 서버 실행

#### Python 사용
```bash
python -m http.server 8000
```

#### Node.js 사용
```bash
npx serve
```

### 3. 브라우저 열기

http://localhost:8000 접속

## 📊 데이터 포맷

### InSAR GeoJSON 포맷
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [127.1234, 37.5678]
      },
      "properties": {
        "point_id": "P001",
        "velocity": -2.3,
        "timeseries": [
          {"date": "2024-01-01", "displacement": 0.0},
          {"date": "2024-02-01", "displacement": -2.3}
        ]
      }
    }
  ]
}
```

### Sentinel-1 JSON 포맷
```json
{
  "sentinel_data": [
    {
      "id": "S1A_IW_SLC__1SDV_20240927T093227...",
      "date": "2024-09-27",
      "time": "09:32:27",
      "orbit_direction": "ascending",
      "bounds": {
        "north": 37.5,
        "south": 37.0,
        "east": 127.5,
        "west": 127.0
      }
    }
  ]
}
```

## 🔧 데이터 전처리 스크립트

### NetCDF → GeoJSON 변환
```bash
# 파일 구조 확인
python scripts/nc_to_geojson.py --inspect your_data.nc

# 변환 실행
python scripts/nc_to_geojson.py your_data.nc output.geojson
```

### Sentinel-1 메타데이터 추출
```bash
# 단일 폴더
python scripts/extract_sentinel_metadata.py path/to/xxx.SAFE

# 일괄 처리
python scripts/extract_sentinel_metadata.py path/to/safe_directory --batch
```

## 🌐 배포

### GitHub Pages
1. GitHub 저장소 설정에서 Pages 활성화
2. 소스: main 브랜치
3. 데이터 파일을 `data/processed/` 폴더에 커밋
4. https://your-username.github.io/InSAR_Web_dem 접속

### 로컬 네트워크 공유
```bash
# 특정 IP로 바인딩
python -m http.server 8000 --bind 0.0.0.0

# 접속: http://<your-ip>:8000
```

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **지도**: Leaflet.js + OpenStreetMap
- **차트**: Chart.js
- **데이터**: GeoJSON, JSON
- **전처리**: Python (xarray, rasterio)

## 📝 사용 가이드

1. **Sentinel-1 목록 탐색**
   - 왼쪽 사이드바에서 씬 클릭
   - 검색창으로 날짜/ID 필터링

2. **InSAR 포인트 보기**
   - 지도에 색상으로 변위량 표시
   - 포인트 클릭하여 상세 정보 보기

3. **시계열 그래프 확인**
   - 포인트 클릭 → 팝업에서 "그래프 보기" 버튼
   - 시간에 따른 변위량 추이 확인

4. **지도 컨트롤**
   - InSAR 포인트 토글: 표시/숨기기
   - 초기 화면: 전체 데이터 범위로 이동

## 🔍 문제 해결

### 데이터가 표시되지 않을 때
1. 브라우저 개발자 도구 (F12) 열기
2. Console 탭에서 에러 확인
3. Network 탭에서 데이터 파일 로드 확인
4. 파일 경로가 올바른지 확인: `data/processed/subsidence_filtered_subsidence_points.geojson`

### CORS 에러가 발생할 때
- 반드시 HTTP 서버를 통해 접속 (파일 직접 열기 X)
- `python -m http.server` 또는 `npx serve` 사용

## 📚 추가 문서

- [PRD.md](PRD.md) - 상세 프로젝트 요구사항 및 설계

## 🤝 기여

이슈나 개선 사항은 GitHub Issues에 등록해주세요.

## 📄 라이선스

MIT License

---

**프로젝트 정보**
- 데이터: Sentinel-1 (20개 씬, 191 포인트)
- 목적: 회사 InSAR 데이터 시각화 데모
- 버전: 1.0
