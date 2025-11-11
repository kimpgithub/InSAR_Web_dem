/**
 * main.js
 * 앱 초기화 및 전역 상태 관리
 */

// 전역 상태
const AppState = {
    sentinelData: [],
    insarData: null,
    map: null,
    insarLayer: null,
    sentinelBoundsLayer: null,
    currentChart: null,
    selectedSentinel: null
};

// 설정
const Config = {
    dataPath: {
        sentinel: 'data/processed/sentinel_list.json',
        insar: 'data/processed/subsidence_timeseries_subsidence_points_timeseries.geojson',
        // 실제 데이터가 없을 때 사용할 샘플 데이터
        sampleInsar: 'data/processed/sample_insar_points.geojson'
    },
    // AOI 중심점 (InSAR 처리 영역: 126.971-126.997, 37.403-37.420)
    defaultCenter: [37.4115, 126.984], // 서울 강남구
    defaultZoom: 15  // 작은 AOI를 위한 높은 줌 레벨
};

/**
 * 앱 초기화
 */
async function initApp() {
    console.log('🚀 InSAR Web Visualization Platform 초기화...');

    try {
        // 지도 초기화
        initMap();

        // 데이터 로드
        await loadData();

        // 이벤트 리스너 설정
        setupEventListeners();

        console.log('✅ 앱 초기화 완료');

    } catch (error) {
        console.error('❌ 앱 초기화 실패:', error);
        showError('데이터 로드 중 오류가 발생했습니다.');
    }
}

/**
 * 데이터 로드
 */
async function loadData() {
    console.log('📥 데이터 로딩 중...');

    // InSAR 데이터 로드 (실제 데이터 → 샘플 데이터 순으로 시도)
    try {
        let insarResponse = await fetch(Config.dataPath.insar);

        // 실제 데이터가 없으면 샘플 데이터 시도
        if (!insarResponse.ok) {
            console.warn('실제 InSAR 데이터 없음, 샘플 데이터 로드 시도...');
            insarResponse = await fetch(Config.dataPath.sampleInsar);

            if (!insarResponse.ok) {
                throw new Error('샘플 데이터도 로드 실패');
            }
            console.log('📌 샘플 InSAR 데이터 사용');
        } else {
            console.log('📌 실제 InSAR 데이터 사용');
        }

        AppState.insarData = await insarResponse.json();
        console.log(`✓ InSAR 포인트 ${AppState.insarData.features.length}개 로드`);

        // 로드된 데이터 확인 (디버깅)
        if (AppState.insarData.features.length > 0) {
            const firstPoint = AppState.insarData.features[0];
            const coords = firstPoint.geometry.coordinates;
            const props = firstPoint.properties;
            console.log('📍 첫 번째 포인트 정보:');
            console.log(`   좌표: [${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}]`);
            console.log(`   ID: ${props.point_id || props.id}`);
            console.log(`   Velocity: ${props.velocity?.toFixed(2)} mm/year`);

            // 실제 데이터 vs 샘플 데이터 구분
            if (props.point_id && props.point_id.startsWith('P')) {
                console.warn('⚠️  샘플 더미 데이터가 로드되었습니다!');
            } else {
                console.log('✅ 실제 InSAR 데이터가 로드되었습니다!');
            }
        }

        // timeseries 데이터 구조 변환 (dates 배열 + displacement_mm 배열 → [{date, displacement}] 형식)
        transformTimeseriesData(AppState.insarData);

        // 지도에 InSAR 데이터 표시
        displayInsarData(AppState.insarData);

        // InSAR 데이터 범위로 지도 이동
        fitMapToInsarData();

    } catch (error) {
        console.error('InSAR 데이터 로드 오류:', error);
        showWarning('InSAR 데이터를 로드할 수 없습니다. 데이터 파일을 확인하세요.');
    }

    // Sentinel-1 데이터 로드
    try {
        const sentinelResponse = await fetch(Config.dataPath.sentinel);
        if (!sentinelResponse.ok) {
            // 샘플 데이터 생성
            console.warn('Sentinel-1 데이터 없음, 샘플 데이터 사용');
            AppState.sentinelData = generateSampleSentinelData();
        } else {
            const sentinelJson = await sentinelResponse.json();
            AppState.sentinelData = sentinelJson.sentinel_data || [];
        }
        console.log(`✓ Sentinel-1 씬 ${AppState.sentinelData.length}개 로드`);

        // 사이드바에 Sentinel 목록 표시
        displaySentinelList(AppState.sentinelData);

    } catch (error) {
        console.error('Sentinel-1 데이터 로드 오류:', error);
        // 샘플 데이터 생성
        AppState.sentinelData = generateSampleSentinelData();
        displaySentinelList(AppState.sentinelData);
    }
}

/**
 * timeseries 데이터 구조 변환
 * {dates: [...], displacement_mm: [...]} → [{date, displacement}, ...]
 */
function transformTimeseriesData(geojsonData) {
    if (!geojsonData || !geojsonData.features) return;

    console.log('🔄 timeseries 데이터 구조 변환 시작...');

    geojsonData.features.forEach((feature, featureIndex) => {
        const props = feature.properties;

        // timeseries가 객체 형식이면 배열로 변환
        if (props.timeseries && props.timeseries.dates && props.timeseries.displacement_mm) {
            const dates = props.timeseries.dates;
            const displacements = props.timeseries.displacement_mm;

            // 첫 번째 포인트만 디버깅 로그
            if (featureIndex === 0) {
                console.log('변환 전 timeseries 샘플:');
                console.log('  dates[0]:', dates[0], 'type:', typeof dates[0]);
                console.log('  displacement_mm[0]:', displacements[0]);
            }

            const transformedTimeseries = [];
            for (let i = 0; i < dates.length; i++) {
                const formattedDate = formatDate(dates[i]);

                // 첫 번째 포인트의 첫 3개 날짜만 로그
                if (featureIndex === 0 && i < 3) {
                    console.log(`  변환 [${i}]:`, dates[i], '→', formattedDate);
                }

                transformedTimeseries.push({
                    date: formattedDate,
                    displacement: displacements[i]
                });
            }

            props.timeseries = transformedTimeseries;

            // 첫 번째 포인트만 변환 후 결과 확인
            if (featureIndex === 0) {
                console.log('변환 후 timeseries 샘플:', transformedTimeseries.slice(0, 3));
            }
        }

        // 좌표 정보 추가 (팝업에서 사용)
        if (!props.coordinates && feature.geometry && feature.geometry.coordinates) {
            props.coordinates = feature.geometry.coordinates;
        }

        // point_id가 없으면 id 사용
        if (!props.point_id && props.id !== undefined) {
            props.point_id = props.id;
        }
    });

    console.log('✓ timeseries 데이터 구조 변환 완료');
}

/**
 * 날짜 형식 변환: YYYYMMDD → YYYY-MM-DD
 */
function formatDate(dateStr) {
    if (!dateStr) {
        console.error('formatDate: Empty input');
        return 'N/A';
    }

    // 문자열로 변환
    const str = String(dateStr).trim();

    // 이미 YYYY-MM-DD 형식이면 그대로 반환
    if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return str;
    }

    // YYYYMMDD 형식이면 변환 (8자리 숫자)
    if (str.match(/^\d{8}$/)) {
        const year = str.substring(0, 4);
        const month = str.substring(4, 6);
        const day = str.substring(6, 8);
        const result = `${year}-${month}-${day}`;

        // 유효성 검증
        if (result.includes('NaN')) {
            console.error('formatDate: NaN in result:', result, 'from:', str);
            return str;
        }

        return result;
    }

    console.warn('formatDate: Unexpected format:', str);
    return str;
}

/**
 * 샘플 Sentinel-1 데이터 생성 (테스트용)
 * InSAR 처리 코드의 실제 AOI 기반
 */
function generateSampleSentinelData() {
    const samples = [];
    const baseDate = new Date('2024-01-07');

    for (let i = 0; i < 20; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i * 12); // 12일 간격

        samples.push({
            id: `S1A_IW_SLC__1SDV_${date.toISOString().split('T')[0].replace(/-/g, '')}T093227`,
            date: date.toISOString().split('T')[0],
            time: '09:32:27',
            mission: 'S1A',
            orbit_direction: 'ascending',  // 실제 데이터는 모두 ascending
            orbit_number: 51999 + i * 175,
            bounds: {
                north: 37.420,
                south: 37.403,
                east: 126.997,
                west: 126.971
            }
        });
    }

    return samples;
}

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
    // InSAR 포인트 토글
    const toggleInsarBtn = document.getElementById('toggle-insar-btn');
    if (toggleInsarBtn) {
        toggleInsarBtn.addEventListener('click', toggleInsarLayer);
    }

    // 초기 화면 리셋
    const resetViewBtn = document.getElementById('reset-view-btn');
    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', resetMapView);
    }

    // 모달 닫기
    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    // 모달 외부 클릭 시 닫기
    const modal = document.getElementById('chart-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // 검색
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // 통계 패널 토글
    const toggleStatsBtn = document.getElementById('toggle-stats-btn');
    if (toggleStatsBtn) {
        toggleStatsBtn.addEventListener('click', toggleStatsPanel);
    }

    // 통계 패널 닫기
    const closeStatsBtn = document.getElementById('close-stats');
    if (closeStatsBtn) {
        closeStatsBtn.addEventListener('click', closeStatsPanel);
    }

    // CSV 내보내기
    const exportCsvBtn = document.getElementById('export-csv-btn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportToCSV);
    }
}

/**
 * InSAR 레이어 토글
 */
function toggleInsarLayer() {
    const btn = document.getElementById('toggle-insar-btn');

    if (AppState.insarLayer) {
        if (AppState.map.hasLayer(AppState.insarLayer)) {
            AppState.map.removeLayer(AppState.insarLayer);
            btn.classList.remove('active');
        } else {
            AppState.map.addLayer(AppState.insarLayer);
            btn.classList.add('active');
        }
    }
}

/**
 * 지도 초기 화면으로 리셋
 */
function resetMapView() {
    console.log('🔄 화면 초기화 중...');

    // 1. 센티넬 경계 레이어 제거 (포인트 클릭 방해 해결)
    clearSentinelBounds();

    // 2. 선택된 센티넬 아이템 하이라이트 제거
    AppState.selectedSentinel = null;
    document.querySelectorAll('.sentinel-item').forEach(el => {
        el.classList.remove('active');
    });

    // 3. 차트 모달 닫기
    closeModal();

    // 4. 통계 패널 닫기
    closeStatsPanel();

    // 5. InSAR 레이어 표시 확인 (숨겨져 있으면 다시 표시)
    if (AppState.insarLayer && !AppState.map.hasLayer(AppState.insarLayer)) {
        AppState.map.addLayer(AppState.insarLayer);
        const toggleInsarBtn = document.getElementById('toggle-insar-btn');
        if (toggleInsarBtn) {
            toggleInsarBtn.classList.add('active');
        }
    }

    // 6. 맵 뷰를 InSAR 데이터 범위로 리셋
    if (AppState.insarData && AppState.insarData.features.length > 0) {
        fitMapToInsarData();
    } else {
        AppState.map.setView(Config.defaultCenter, Config.defaultZoom);
    }

    console.log('✅ 화면 초기화 완료');
}

/**
 * InSAR 데이터 범위에 맞춰 지도 이동
 */
function fitMapToInsarData() {
    if (!AppState.insarData || !AppState.insarData.features.length) return;

    const bounds = L.geoJSON(AppState.insarData).getBounds();
    AppState.map.fitBounds(bounds, { padding: [50, 50] });
}

/**
 * 검색 핸들러
 */
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();

    const filtered = AppState.sentinelData.filter(item => {
        const id = (item.id || '').toLowerCase();
        const date = (item.date || '').toLowerCase();
        return id.includes(searchTerm) || date.includes(searchTerm);
    });

    displaySentinelList(filtered);
}

/**
 * 모달 열기
 */
function openModal() {
    const modal = document.getElementById('chart-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

/**
 * 모달 닫기
 */
function closeModal() {
    const modal = document.getElementById('chart-modal');
    if (modal) {
        modal.classList.remove('show');
    }

    // 차트 정리
    if (AppState.currentChart) {
        AppState.currentChart.destroy();
        AppState.currentChart = null;
    }
}

/**
 * 에러 메시지 표시
 */
function showError(message) {
    console.error(message);
    alert(`오류: ${message}`);
}

/**
 * 경고 메시지 표시
 */
function showWarning(message) {
    console.warn(message);
}

/**
 * DOM 로드 완료 후 앱 초기화
 */
document.addEventListener('DOMContentLoaded', initApp);
