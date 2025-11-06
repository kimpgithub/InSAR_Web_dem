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
            </div>
            <div class="sentinel-date">${formatDate(date)}</div>
            <div class="sentinel-time">${time}</div>
            <div class="sentinel-id">${shortenId(id)}</div>
        </div>
    `;
}

/**
 * 날짜 포맷팅
 */
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
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
