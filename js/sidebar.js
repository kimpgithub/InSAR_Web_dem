/**
 * sidebar.js
 * Sentinel-1 데이터 목록 표시 및 관리
 */

/**
 * Sentinel-1 목록 표시
 */
function displaySentinelList(sentinelData) {
    const listContainer = document.getElementById('sentinel-list');
    const sceneCount = document.getElementById('scene-count');

    if (!listContainer) return;

    // 개수 업데이트
    if (sceneCount) {
        sceneCount.textContent = sentinelData.length;
    }

    // 데이터가 없으면
    if (!sentinelData || sentinelData.length === 0) {
        listContainer.innerHTML = '<div class="no-data">데이터가 없습니다.</div>';
        return;
    }

    // 날짜순 정렬 (최신순)
    const sorted = [...sentinelData].sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA;
    });

    // HTML 생성
    let html = '';
    sorted.forEach((item, index) => {
        html += createSentinelItem(item, index);
    });

    listContainer.innerHTML = html;

    // 클릭 이벤트 추가
    addSentinelItemListeners();
}

/**
 * Sentinel-1 아이템 HTML 생성
 */
function createSentinelItem(item, index) {
    const id = item.id || 'Unknown';
    const date = item.date || 'Unknown';
    const time = item.time || '';
    const orbit = item.orbit_direction || 'unknown';
    const orbitClass = orbit.toLowerCase();

    return `
        <div class="sentinel-item" data-index="${index}" data-id="${id}">
            <div class="sentinel-item-header">
                <span class="sentinel-orbit ${orbitClass}">${orbit}</span>
                <button class="sentinel-info-btn" onclick="showSentinelMetadata(${index}); event.stopPropagation();" title="메타데이터 보기">
                    ℹ️
                </button>
            </div>
            <div class="sentinel-date">${formatSentinelDate(date)}</div>
            <div class="sentinel-time">${time}</div>
            <div class="sentinel-id">${shortenId(id)}</div>
        </div>
    `;
}

/**
 * 날짜 포맷팅 (Sentinel 사이드바용)
 */
function formatSentinelDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString;
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch {
        return dateString;
    }
}

/**
 * ID 축약 (너무 길면)
 */
function shortenId(id) {
    if (id.length > 40) {
        return id.substring(0, 37) + '...';
    }
    return id;
}

/**
 * Sentinel 아이템 클릭 리스너 추가
 */
function addSentinelItemListeners() {
    const items = document.querySelectorAll('.sentinel-item');

    items.forEach(item => {
        item.addEventListener('click', () => {
            handleSentinelItemClick(item);
        });
    });
}

/**
 * Sentinel 아이템 클릭 핸들러
 */
function handleSentinelItemClick(itemElement) {
    const index = parseInt(itemElement.getAttribute('data-index'));
    const sentinelItem = AppState.sentinelData[index];

    if (!sentinelItem) return;

    console.log('선택된 Sentinel-1 씬:', sentinelItem.id);

    // 활성화 표시
    document.querySelectorAll('.sentinel-item').forEach(el => {
        el.classList.remove('active');
    });
    itemElement.classList.add('active');

    // 전역 상태 업데이트
    AppState.selectedSentinel = sentinelItem;

    // 지도에 범위 표시
    if (sentinelItem.bounds) {
        showSentinelBounds(sentinelItem);
    }
}

/**
 * Sentinel-1 메타데이터 표시
 */
function showSentinelMetadata(index) {
    const sentinelItem = AppState.sentinelData[index];
    if (!sentinelItem) return;

    console.log('📋 메타데이터 표시:', sentinelItem.id);

    // 메타데이터 내용 생성
    let metadataHtml = `
        <h3>Sentinel-1 메타데이터</h3>
        <div class="metadata-content">
    `;

    // ID
    metadataHtml += createMetadataItem('Product ID', sentinelItem.id || 'N/A');

    // 날짜/시간
    if (sentinelItem.date) {
        metadataHtml += createMetadataItem('취득 날짜', formatSentinelDate(sentinelItem.date));
    }
    if (sentinelItem.time) {
        metadataHtml += createMetadataItem('취득 시각', sentinelItem.time);
    }

    // Mission
    if (sentinelItem.mission) {
        metadataHtml += createMetadataItem('위성', sentinelItem.mission);
    }

    // Orbit
    if (sentinelItem.orbit_direction) {
        metadataHtml += createMetadataItem('궤도 방향', sentinelItem.orbit_direction);
    }
    if (sentinelItem.orbit_number) {
        metadataHtml += createMetadataItem('궤도 번호', sentinelItem.orbit_number);
    }

    // Bounds
    if (sentinelItem.bounds) {
        const bounds = sentinelItem.bounds;
        metadataHtml += createMetadataItem('범위 (위도)', `${bounds.south.toFixed(4)}° ~ ${bounds.north.toFixed(4)}°`);
        metadataHtml += createMetadataItem('범위 (경도)', `${bounds.west.toFixed(4)}° ~ ${bounds.east.toFixed(4)}°`);
    }

    metadataHtml += '</div>';

    // 모달에 표시
    const modalContent = document.getElementById('metadata-modal-content');
    if (modalContent) {
        modalContent.innerHTML = metadataHtml;
    }

    // 모달 열기
    const modal = document.getElementById('metadata-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

/**
 * 메타데이터 아이템 HTML 생성
 */
function createMetadataItem(label, value) {
    return `
        <div class="metadata-item">
            <div class="metadata-label">${label}</div>
            <div class="metadata-value">${value}</div>
        </div>
    `;
}

/**
 * 메타데이터 모달 닫기
 */
function closeMetadataModal() {
    const modal = document.getElementById('metadata-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}
