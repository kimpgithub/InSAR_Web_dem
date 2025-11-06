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
    currentChart: null,
    selectedSentinel: null
};

// 설정
const Config = {
    dataPath: {
        sentinel: 'data/processed/sentinel_list.json',
        insar: 'data/processed/subsidence_filtered_subsidence_points.geojson',
        // 실제 데이터가 없을 때 사용할 샘플 데이터
        sampleInsar: 'data/processed/sample_insar_points.geojson'
    },
    defaultCenter: [37.5, 127.0], // 기본 중심 (한국)
    defaultZoom: 8
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
 * 샘플 Sentinel-1 데이터 생성 (테스트용)
 */
function generateSampleSentinelData() {
    const samples = [];
    const baseDate = new Date('2024-01-01');

    for (let i = 0; i < 20; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i * 12); // 12일 간격

        samples.push({
            id: `S1A_IW_SLC__1SDV_${date.toISOString().split('T')[0].replace(/-/g, '')}T093227`,
            date: date.toISOString().split('T')[0],
            time: '09:32:27',
            mission: 'S1A',
            orbit_direction: i % 2 === 0 ? 'ascending' : 'descending',
            orbit_number: 55849 + i,
            bounds: {
                north: 37.6,
                south: 37.4,
                east: 127.1,
                west: 126.9
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
    if (AppState.insarData && AppState.insarData.features.length > 0) {
        fitMapToInsarData();
    } else {
        AppState.map.setView(Config.defaultCenter, Config.defaultZoom);
    }
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
