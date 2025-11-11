/**
 * stats.js
 * 데이터 통계 계산 및 표시, CSV 내보내기
 */

/**
 * 통계 패널 토글
 */
function toggleStatsPanel() {
    const panel = document.getElementById('stats-panel');
    const btn = document.getElementById('toggle-stats-btn');

    if (!panel) return;

    if (panel.classList.contains('show')) {
        panel.classList.remove('show');
        btn.classList.remove('active');
    } else {
        panel.classList.add('show');
        btn.classList.add('active');
        updateStatsPanel();
    }
}

/**
 * 통계 패널 닫기
 */
function closeStatsPanel() {
    const panel = document.getElementById('stats-panel');
    const btn = document.getElementById('toggle-stats-btn');

    if (panel) {
        panel.classList.remove('show');
    }
    if (btn) {
        btn.classList.remove('active');
    }
}

/**
 * 통계 패널 업데이트
 */
function updateStatsPanel() {
    const content = document.getElementById('stats-content');
    if (!content) return;

    if (!AppState.insarData || !AppState.insarData.features) {
        content.innerHTML = '<div class="stats-loading">데이터가 없습니다.</div>';
        return;
    }

    const stats = calculateInSARStats(AppState.insarData);

    // HTML 생성
    let html = '';

    // 전체 통계
    html += `
        <div class="stat-group">
            <div class="stat-group-title">전체 통계</div>
            <div class="stat-item">
                <span class="stat-label">총 포인트 수</span>
                <span class="stat-value">${stats.totalPoints}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">시간 포인트</span>
                <span class="stat-value">${stats.timePoints}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">데이터 기간</span>
                <span class="stat-value">${stats.dateRange}</span>
            </div>
        </div>
    `;

    // 변위 속도 통계
    html += `
        <div class="stat-group">
            <div class="stat-group-title">변위 속도 (mm/year)</div>
            <div class="stat-item">
                <span class="stat-label">평균</span>
                <span class="stat-value ${stats.velocity.mean < 0 ? 'negative' : 'positive'}">
                    ${stats.velocity.mean.toFixed(2)}
                </span>
            </div>
            <div class="stat-item">
                <span class="stat-label">최소 (침하)</span>
                <span class="stat-value negative">${stats.velocity.min.toFixed(2)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">최대 (융기)</span>
                <span class="stat-value positive">${stats.velocity.max.toFixed(2)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">표준편차</span>
                <span class="stat-value">${stats.velocity.std.toFixed(2)}</span>
            </div>
        </div>
    `;

    // 변위 분포
    html += `
        <div class="stat-group">
            <div class="stat-group-title">변위 분포</div>
            <div class="stat-item">
                <span class="stat-label">침하 (&lt; -5)</span>
                <span class="stat-value negative">${stats.distribution.subsiding}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">안정 (-5 ~ 5)</span>
                <span class="stat-value">${stats.distribution.stable}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">융기 (&gt; 5)</span>
                <span class="stat-value positive">${stats.distribution.uplifting}</span>
            </div>
        </div>
    `;

    // 간섭성 통계 (있으면)
    if (stats.coherence.available) {
        html += `
            <div class="stat-group">
                <div class="stat-group-title">간섭성</div>
                <div class="stat-item">
                    <span class="stat-label">평균</span>
                    <span class="stat-value">${stats.coherence.mean.toFixed(3)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">최소</span>
                    <span class="stat-value">${stats.coherence.min.toFixed(3)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">최대</span>
                    <span class="stat-value">${stats.coherence.max.toFixed(3)}</span>
                </div>
            </div>
        `;
    }

    content.innerHTML = html;
}

/**
 * InSAR 통계 계산
 */
function calculateInSARStats(geojsonData) {
    const features = geojsonData.features;

    // 기본 통계
    const totalPoints = features.length;

    // 속도 데이터 수집
    const velocities = [];
    const coherences = [];
    let timePoints = 0;
    let startDate = null;
    let endDate = null;

    features.forEach(feature => {
        const props = feature.properties;

        // 속도
        if (props.velocity !== undefined && props.velocity !== null) {
            velocities.push(props.velocity);
        }

        // 간섭성 (포인트별)
        if (props.coherence !== undefined && props.coherence !== null) {
            coherences.push(props.coherence);
        }

        // 시계열
        if (props.timeseries && props.timeseries.length > 0) {
            timePoints = Math.max(timePoints, props.timeseries.length);

            // 날짜 범위
            const dates = props.timeseries.map(t => new Date(t.date));
            const minDate = new Date(Math.min(...dates));
            const maxDate = new Date(Math.max(...dates));

            if (!startDate || minDate < startDate) startDate = minDate;
            if (!endDate || maxDate > endDate) endDate = maxDate;

            // 시계열별 간섭성 (있을 경우 추가)
            props.timeseries.forEach(t => {
                if (t.coherence !== undefined && t.coherence !== null && !props.coherence) {
                    coherences.push(t.coherence);
                }
            });
        }
    });

    // 속도 통계
    const velocityStats = calculateArrayStats(velocities);

    // 변위 분포
    const subsiding = velocities.filter(v => v < -5).length;
    const stable = velocities.filter(v => v >= -5 && v <= 5).length;
    const uplifting = velocities.filter(v => v > 5).length;

    // 간섭성 통계
    const coherenceStats = coherences.length > 0
        ? calculateArrayStats(coherences)
        : { available: false };

    // 날짜 범위 문자열
    let dateRange = 'N/A';
    if (startDate && endDate) {
        const formatDate = (d) => d.toISOString().split('T')[0];
        dateRange = `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
    }

    return {
        totalPoints,
        timePoints,
        dateRange,
        velocity: {
            ...velocityStats,
            available: velocities.length > 0
        },
        coherence: {
            ...coherenceStats,
            available: coherences.length > 0
        },
        distribution: {
            subsiding,
            stable,
            uplifting
        }
    };
}

/**
 * 배열 통계 계산
 */
function calculateArrayStats(arr) {
    if (!arr || arr.length === 0) {
        return { mean: 0, min: 0, max: 0, std: 0 };
    }

    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const min = Math.min(...arr);
    const max = Math.max(...arr);

    const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    const std = Math.sqrt(variance);

    return { mean, min, max, std };
}

/**
 * CSV로 내보내기
 */
function exportToCSV() {
    if (!AppState.insarData || !AppState.insarData.features) {
        alert('내보낼 데이터가 없습니다.');
        return;
    }

    console.log('📥 CSV 내보내기 시작...');

    const features = AppState.insarData.features;

    // CSV 헤더
    let csv = 'Point ID,Latitude,Longitude,Velocity (mm/year),Mean Displacement (mm),Max Displacement (mm),Min Displacement (mm)\n';

    // 데이터 행
    features.forEach(feature => {
        const props = feature.properties;
        const coords = feature.geometry.coordinates;

        const pointId = props.point_id || props.id || 'N/A';
        const lat = coords[1];
        const lon = coords[0];
        const velocity = props.velocity !== undefined ? props.velocity.toFixed(2) : 'N/A';

        let meanDisp = 'N/A';
        let maxDisp = 'N/A';
        let minDisp = 'N/A';

        if (props.statistics) {
            meanDisp = props.statistics.mean_displacement !== undefined
                ? props.statistics.mean_displacement.toFixed(2)
                : 'N/A';
            maxDisp = props.statistics.max_displacement !== undefined
                ? props.statistics.max_displacement.toFixed(2)
                : 'N/A';
            minDisp = props.statistics.min_displacement !== undefined
                ? props.statistics.min_displacement.toFixed(2)
                : 'N/A';
        }

        csv += `${pointId},${lat},${lon},${velocity},${meanDisp},${maxDisp},${minDisp}\n`;
    });

    // 파일 다운로드
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `insar_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('✅ CSV 내보내기 완료');
}

/**
 * 시계열 데이터 CSV 내보내기
 */
function exportTimeseriesCSV(pointProperties) {
    if (!pointProperties.timeseries || pointProperties.timeseries.length === 0) {
        alert('시계열 데이터가 없습니다.');
        return;
    }

    const pointId = pointProperties.point_id || pointProperties.id || 'Unknown';

    // CSV 헤더
    let csv = 'Date,Displacement (mm),Coherence\n';

    // 데이터 행
    pointProperties.timeseries.forEach(point => {
        const date = point.date || 'N/A';
        const disp = point.displacement !== null && point.displacement !== undefined
            ? point.displacement.toFixed(2)
            : 'N/A';
        const coh = point.coherence !== null && point.coherence !== undefined
            ? point.coherence.toFixed(3)
            : 'N/A';

        csv += `${date},${disp},${coh}\n`;
    });

    // 파일 다운로드
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `timeseries_${pointId}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
