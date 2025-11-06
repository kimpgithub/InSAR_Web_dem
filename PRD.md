# InSAR Web Visualization Platform - PRD

## 1. 프로젝트 개요

InSAR (Interferometric Synthetic Aperture Radar) 분석 결과와 Sentinel-1 SLC 데이터를 웹 기반으로 시각화하는 플랫폼

**목적**: 회사에서 생성한 InSAR 데이터를 간단하고 직관적으로 보여주는 웹 애플리케이션

## 2. 핵심 요구사항

### 2.1 주요 기능
- Sentinel-1 데이터 목록 표시 (썸네일 포함)
- OSM 기반 지도에 InSAR 데이터 시각화
- 지도상 포인트 클릭 시 시계열 그래프 팝업
- 데이터 조회 및 탐색 (인터랙티브 지도)

### 2.2 사용자 인터랙션
- Sentinel-1 데이터 목록 클릭
- 지도 이동/확대/축소
- InSAR 포인트 클릭하여 시계열 그래프 조회

## 3. UI/UX 설계

### 3.1 레이아웃
참고: Copernicus Data Space 레이아웃

```
┌─────────────────────────────────────────┐
│         Header (제목/로고)              │
├──────────┬──────────────────────────────┤
│          │                              │
│ Sentinel │                              │
│ 데이터    │        지도 영역              │
│ 목록     │       (OSM 기반)             │
│          │                              │
│ (세로    │    - InSAR 데이터 레이어      │
│  리스트) │    - 포인트 마커              │
│          │    - 시계열 그래프 팝업        │
│          │                              │
│          │                              │
└──────────┴──────────────────────────────┘
  ~20-25%           ~75-80%
```

### 3.2 왼쪽 패널 (Sentinel-1 목록)
- 세로 스크롤 가능한 리스트
- 각 항목 구성:
  - 썸네일 이미지
  - 날짜/시간
  - 궤도 정보 (ascending/descending)
  - 프레임/경로 번호
- 클릭 시 해당 데이터 위치로 지도 이동

### 3.3 오른쪽 패널 (지도)
- OSM (OpenStreetMap) 배경
- InSAR 데이터 레이어 오버레이
- 포인트별 마커/색상 표시 (변위량 기준)
- 포인트 클릭 시:
  - 모달/팝업 창 표시
  - 시계열 그래프 (날짜 vs 변위량)
  - 포인트 정보 (좌표, 통계 등)

## 4. 기술 스택 제안

### 4.1 Frontend
**추천: 간단하고 배우기 쉬운 스택**

- **HTML/CSS/JavaScript** (바닐라 JS 또는 간단한 프레임워크)
- **지도 라이브러리**:
  - [Leaflet.js](https://leafletjs.com/) - 가볍고 사용하기 쉬움
  - OSM 타일 무료 사용 가능
- **차트 라이브러리**:
  - [Chart.js](https://www.chartjs.org/) - 간단한 시계열 그래프
  - 또는 [Plotly.js](https://plotly.com/javascript/) - 인터랙티브 그래프
- **스타일링**:
  - 순수 CSS 또는 [Bootstrap](https://getbootstrap.com/) (빠른 레이아웃)

대안: React.js (더 복잡하지만 확장성 좋음)

### 4.2 Backend (선택사항)
**필요 시**:
- **Python Flask** 또는 **FastAPI** - 간단한 API 서버
- 정적 파일 서빙 (이미지, GeoJSON 등)
- 데이터 쿼리/필터링

**또는**:
- 순수 정적 웹사이트 (GitHub Pages, Netlify 등 호스팅 가능)
- 모든 데이터를 미리 생성된 JSON/GeoJSON 파일로 제공

### 4.3 데이터베이스 (선택사항)
현재는 불필요 - 파일 기반 데이터로 충분

## 5. 데이터 포맷

### 5.1 Sentinel-1 목록 데이터
```json
{
  "sentinel_data": [
    {
      "id": "S1A_IW_SLC__1SDV_20230101T...",
      "date": "2023-01-01",
      "time": "05:30:00",
      "orbit": "ascending",
      "frame": 123,
      "path": 45,
      "thumbnail": "/data/thumbnails/S1A_20230101.png",
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

### 5.2 InSAR 데이터 포맷

**옵션 1: GeoJSON (포인트 데이터)**
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
        "displacement": -12.5,
        "velocity": -2.3,
        "coherence": 0.85,
        "timeseries": [
          {"date": "2023-01-01", "displacement": 0.0},
          {"date": "2023-02-01", "displacement": -2.3},
          {"date": "2023-03-01", "displacement": -5.1}
        ]
      }
    }
  ]
}
```

**옵션 2: GeoTIFF (래스터 데이터)**
- 변위량 맵을 GeoTIFF로 저장
- Leaflet + GeoRaster 플러그인으로 표시
- 포인트별 시계열은 별도 JSON 파일

**추천**: GeoJSON (포인트) + 별도 시계열 JSON
- 브라우저에서 직접 처리 가능
- 인터랙티브 기능 구현 쉬움
- 파일 크기 관리 용이

### 5.3 시계열 그래프 데이터
각 포인트별로 별도 JSON 또는 GeoJSON properties에 포함

```json
{
  "point_id": "P001",
  "coordinates": [127.1234, 37.5678],
  "timeseries": [
    {"date": "2023-01-01", "displacement": 0.0, "coherence": 0.85},
    {"date": "2023-01-12", "displacement": -1.2, "coherence": 0.82},
    {"date": "2023-01-24", "displacement": -2.3, "coherence": 0.88}
  ],
  "statistics": {
    "mean_velocity": -2.3,
    "std_dev": 0.5,
    "max_displacement": -12.5,
    "min_displacement": 0.0
  }
}
```

## 6. 구현 단계

### Phase 1: 기본 레이아웃 및 지도
1. HTML/CSS로 2-패널 레이아웃 구성
2. Leaflet.js로 OSM 지도 표시
3. 왼쪽 패널에 더미 데이터로 리스트 구현

### Phase 2: 데이터 통합
4. Sentinel-1 썸네일 및 메타데이터 표시
5. GeoJSON 형식으로 InSAR 포인트 표시
6. 리스트 클릭 → 지도 이동 기능

### Phase 3: 인터랙티브 기능
7. 포인트 클릭 이벤트 핸들링
8. 시계열 그래프 팝업/모달 구현
9. Chart.js로 그래프 렌더링

### Phase 4: 스타일링 및 최적화
10. UI/UX 개선
11. 반응형 디자인
12. 성능 최적화 (대용량 데이터 처리)

## 7. 디렉토리 구조 제안

```
InSAR_Web_dem/
├── index.html                 # 메인 페이지
├── css/
│   ├── main.css              # 메인 스타일
│   └── map.css               # 지도 관련 스타일
├── js/
│   ├── main.js               # 앱 초기화
│   ├── map.js                # 지도 기능
│   ├── sidebar.js            # 사이드바 리스트
│   └── chart.js              # 그래프 기능
├── data/
│   ├── sentinel_list.json    # Sentinel-1 목록
│   ├── insar_points.geojson  # InSAR 포인트 데이터
│   └── timeseries/           # 포인트별 시계열 JSON
│       ├── P001.json
│       └── P002.json
├── images/
│   └── thumbnails/           # Sentinel-1 썸네일
│       ├── S1A_20230101.png
│       └── ...
└── libs/                     # 외부 라이브러리 (옵션)
```

## 8. 추가 고려사항

### 8.1 성능
- 포인트 개수가 많을 경우 클러스터링 필요 (Leaflet.markercluster)
- 필요시 타일 기반 렌더링
- 데이터 페이지네이션/필터링

### 8.2 향후 확장 가능성
- 사용자 인증/권한 관리
- 데이터 업로드 기능
- 여러 InSAR 프로세싱 결과 비교
- 다운로드 기능
- 데이터베이스 연동

### 8.3 데이터 전처리
- InSAR 결과물을 GeoJSON으로 변환하는 Python 스크립트 필요
- Sentinel-1 메타데이터 추출 스크립트
- 썸네일 생성 자동화

## 9. 다음 단계

1. **PRD 검토 및 승인**
2. 프로토타입 개발 (Phase 1)
3. 샘플 데이터로 테스트
4. 실제 데이터 통합
5. 배포

## 10. 프로젝트 사양 (확정)

### 10.1 현재 데이터 현황

**Sentinel-1 데이터**:
- 썸네일 없음 (TIFF 파일만 보유)
- 형식: `.SAFE` 폴더 내 `s1a-iw2-slc-vv-*.tiff`
- 총 20개 씬 처리 완료

**InSAR 결과물**:
- 포맷: NetCDF (.nc)
- 필터링된 포인트: 191개
- 시계열 데이터 포함

**호스팅**:
- 1차: Windows 노트북 로컬 서버
- 2차: GitHub Pages (가능하면)

**사용자**:
- 회사 데모용
- 예상 동시 접속: 최대 10명

### 10.2 Sentinel-1 시각화 솔루션

썸네일이 없으므로 다음 옵션 고려:

**옵션 1: Copernicus API로 Quicklook 다운로드 (추천)**
```python
# Copernicus Data Space에서 썸네일 검색/다운로드
# API 키 필요, 무료
```
- 장점: 공식 썸네일, 빠름
- 단점: API 설정 필요, 인터넷 연결 필요

**옵션 2: TIFF → PNG 썸네일 변환**
```python
# GDAL/rasterio로 TIFF 읽어서 PNG 생성
# 간단한 histogram stretching 적용
```
- 장점: 오프라인 가능, 커스터마이징 가능
- 단점: SAR 데이터라 시각화 의미 제한적

**옵션 3: 썸네일 없이 텍스트 목록만 표시**
```
📡 S1A_IW_SLC__1SDV_20240927T093227
   날짜: 2024-09-27 09:32:27
   궤도: Ascending
```
- 장점: 가장 간단, 데모에 충분할 수 있음
- 단점: 시각적 매력 부족

**권장사항**:
- **단기 (데모)**: 옵션 3 (텍스트 목록) → 빠르게 구현
- **중기**: 옵션 2 (TIFF → PNG) → Python 스크립트 추가
- **장기**: 옵션 1 (API) → 자동화

### 10.3 NetCDF → GeoJSON 변환 전략

**필요 작업**:
1. NetCDF 파일 구조 분석
2. 좌표(lat/lon) 추출
3. 시계열 데이터 추출
4. GeoJSON 포맷으로 변환

**Python 스크립트 예시**:
```python
import xarray as xr
import json

# NetCDF 읽기
ds = xr.open_dataset('insar_results.nc')

# GeoJSON 생성
geojson = {
    "type": "FeatureCollection",
    "features": []
}

# 각 포인트 처리
for i in range(len(ds.lat)):
    feature = {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [float(ds.lon[i]), float(ds.lat[i])]
        },
        "properties": {
            "point_id": f"P{i:03d}",
            "timeseries": [...]  # NetCDF에서 추출
        }
    }
    geojson["features"].append(feature)

# 저장
with open('insar_points.geojson', 'w') as f:
    json.dump(geojson, f)
```

### 10.4 호스팅 전략

**Phase 1: 로컬 개발 (Windows 노트북)**
```bash
# Python 간단한 HTTP 서버
python -m http.server 8000

# 또는 Node.js
npx serve
```

**Phase 2: GitHub Pages 배포**
- 정적 사이트이므로 가능
- 데이터 규모:
  - 191 포인트 GeoJSON: ~50-200KB (시계열 포함)
  - 20개 썸네일: ~2-5MB (있다면)
  - 전체: <10MB → GitHub 용량 제한 OK
- 장점: 무료, HTTPS, 안정적
- 단점: 공개 저장소 (private 가능하지만 Pro 필요)

**선택사항**:
- 회사 내부망만 접속: 로컬 서버
- 외부 공유 필요: GitHub Pages (private repo)

### 10.5 성능 고려사항

데이터 규모가 작으므로 (20개 씬, 191 포인트):
- 클러스터링 불필요
- 모든 데이터 한번에 로드 가능
- 데이터베이스 불필요
- 단순 JSON/GeoJSON 파일로 충분

---

**문서 작성일**: 2025-11-06
**최종 업데이트**: 2025-11-06
**버전**: 1.1
