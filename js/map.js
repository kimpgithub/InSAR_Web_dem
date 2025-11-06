/**
 * map.js
 * 지도 초기화 및 InSAR 데이터 시각화
 */

/**
 * Leaflet 지도 초기화
 */
function initMap() {
    console.log('🗺️  지도 초기화 중...');

    // 지도 생성
    AppState.map = L.map('map').setView(Config.defaultCenter, Config.defaultZoom);

    // OSM 타일 레이어 추가
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(AppState.map);

    console.log('✓ 지도 초기화 완료');
}

/**
 * InSAR 데이터를 지도에 표시
 */
function displayInsarData(geojsonData) {
    if (!geojsonData || !geojsonData.features) {
        console.warn('표시할 InSAR 데이터가 없습니다.');
        return;
    }

    console.log(`📍 InSAR 포인트 ${geojsonData.features.length}개 표시 중...`);

    // 기존 레이어 제거
    if (AppState.insarLayer) {
        AppState.map.removeLayer(AppState.insarLayer);
    }

    // GeoJSON 레이어 생성
    AppState.insarLayer = L.geoJSON(geojsonData, {
        pointToLayer: createInsarMarker,
        onEachFeature: onEachInsarFeature
    }).addTo(AppState.map);

    console.log('✓ InSAR 포인트 표시 완료');
}

/**
 * InSAR 포인트를 마커로 변환
 */
function createInsarMarker(feature, latlng) {
    const props = feature.properties;

    // 변위량 또는 속도에 따라 색상 결정
    let value = 0;
    if (props.velocity !== undefined) {
        value = props.velocity;
    } else if (props.statistics && props.statistics.mean_displacement !== undefined) {
        // 시계열 데이터가 있으면 평균 속도 계산 (간단히 평균 변위 사용)
        value = props.statistics.mean_displacement;
    }

    const color = getDisplacementColor(value);

    // CircleMarker 생성
    return L.circleMarker(latlng, {
        radius: 6,
        fillColor: color,
        color: '#fff',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    });
}

/**
 * 변위량에 따른 색상 매핑
 */
function getDisplacementColor(value) {
    // RdYlBu 색상 스케일 (빨강-노랑-파랑)
    if (value < -10) return '#d73027';
    if (value < -5) return '#fc8d59';
    if (value < 0) return '#fee090';
    if (value < 5) return '#e0f3f8';
    if (value < 10) return '#91bfdb';
    return '#4575b4';
}

/**
 * 각 InSAR 포인트에 이벤트 추가
 */
function onEachInsarFeature(feature, layer) {
    const props = feature.properties;

    // 팝업 내용 생성
    const popupContent = createPopupContent(props);

    // 팝업 바인딩
    layer.bindPopup(popupContent);

    // 클릭 이벤트: 시계열 그래프 표시
    layer.on('click', () => {
        if (props.timeseries && props.timeseries.length > 0) {
            showTimeseriesChart(props);
        }
    });

    // 마우스 오버: 하이라이트
    layer.on('mouseover', function (e) {
        this.setStyle({
            radius: 10,
            weight: 2
        });
    });

    // 마우스 아웃: 원래대로
    layer.on('mouseout', function (e) {
        this.setStyle({
            radius: 6,
            weight: 1
        });
    });
}

/**
 * 팝업 내용 생성
 */
function createPopupContent(props) {
    const pointId = props.point_id || props.id || 'Unknown';

    let content = `
        <div class="popup-title">포인트 ID: ${pointId}</div>
        <div class="popup-info">
    `;

    // 좌표
    if (props.coordinates) {
        content += `좌표: ${props.coordinates[1].toFixed(5)}, ${props.coordinates[0].toFixed(5)}<br>`;
    }

    // 속도
    if (props.velocity !== undefined) {
        content += `평균 속도: ${props.velocity.toFixed(2)} mm/year<br>`;
    }

    // 통계
    if (props.statistics) {
        const stats = props.statistics;
        if (stats.mean_displacement !== undefined) {
            content += `평균 변위: ${stats.mean_displacement.toFixed(2)} mm<br>`;
        }
        if (stats.max_displacement !== undefined) {
            content += `최대 변위: ${stats.max_displacement.toFixed(2)} mm<br>`;
        }
    }

    content += `</div>`;

    // 시계열 데이터가 있으면 그래프 보기 버튼
    if (props.timeseries && props.timeseries.length > 0) {
        content += `
            <button class="popup-btn" onclick="showTimeseriesChart(${JSON.stringify(props).replace(/"/g, '&quot;')})">
                📈 시계열 그래프 보기
            </button>
        `;
    }

    return content;
}

/**
 * 시계열 그래프 표시
 */
function showTimeseriesChart(properties) {
    console.log('📊 시계열 그래프 표시:', properties.point_id || properties.id);

    // 포인트 정보 업데이트
    updatePointInfo(properties);

    // 차트 생성
    createTimeseriesChart(properties.timeseries);

    // 모달 열기
    openModal();
}

/**
 * 포인트 정보 업데이트
 */
function updatePointInfo(props) {
    const pointInfoDiv = document.getElementById('point-info');
    if (!pointInfoDiv) return;

    let html = '';

    // 포인트 ID
    const pointId = props.point_id || props.id || 'Unknown';
    html += createInfoItem('포인트 ID', pointId);

    // 좌표
    if (props.coordinates) {
        html += createInfoItem('위도', props.coordinates[1].toFixed(5));
        html += createInfoItem('경도', props.coordinates[0].toFixed(5));
    }

    // 속도
    if (props.velocity !== undefined) {
        html += createInfoItem('평균 속도', `${props.velocity.toFixed(2)} mm/year`);
    }

    // 통계
    if (props.statistics) {
        if (props.statistics.mean_displacement !== undefined) {
            html += createInfoItem('평균 변위', `${props.statistics.mean_displacement.toFixed(2)} mm`);
        }
        if (props.statistics.std_displacement !== undefined) {
            html += createInfoItem('표준편차', `${props.statistics.std_displacement.toFixed(2)} mm`);
        }
    }

    pointInfoDiv.innerHTML = html;
}

/**
 * 정보 아이템 HTML 생성
 */
function createInfoItem(label, value) {
    return `
        <div class="point-info-item">
            <div class="point-info-label">${label}</div>
            <div class="point-info-value">${value}</div>
        </div>
    `;
}

/**
 * Sentinel-1 씬 범위를 지도에 표시
 */
function showSentinelBounds(sentinelItem) {
    // 기존 하이라이트 제거
    if (AppState.sentinelBoundsLayer) {
        AppState.map.removeLayer(AppState.sentinelBoundsLayer);
    }

    // 범위가 없으면 종료
    if (!sentinelItem.bounds) return;

    const bounds = sentinelItem.bounds;
    const rectangle = L.rectangle(
        [[bounds.south, bounds.west], [bounds.north, bounds.east]],
        {
            color: '#3498db',
            weight: 2,
            fillOpacity: 0.1
        }
    );

    AppState.sentinelBoundsLayer = rectangle.addTo(AppState.map);

    // 지도 이동
    AppState.map.fitBounds(rectangle.getBounds(), { padding: [50, 50] });
}

/**
 * Sentinel-1 범위 하이라이트 제거
 */
function clearSentinelBounds() {
    if (AppState.sentinelBoundsLayer) {
        AppState.map.removeLayer(AppState.sentinelBoundsLayer);
        AppState.sentinelBoundsLayer = null;
    }
}
