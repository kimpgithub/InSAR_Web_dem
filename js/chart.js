/**
 * chart.js
 * 시계열 그래프 생성 및 관리
 */

/**
 * 시계열 차트 생성
 */
function createTimeseriesChart(timeseriesData) {
    if (!timeseriesData || timeseriesData.length === 0) {
        console.warn('시계열 데이터가 없습니다.');
        return;
    }

    console.log('📊 차트 생성 중...', timeseriesData.length, '개 데이터 포인트');
    console.log('첫 번째 데이터 샘플:', timeseriesData[0]);

    // 기존 차트 제거
    if (AppState.currentChart) {
        AppState.currentChart.destroy();
    }

    // 캔버스 요소
    const canvas = document.getElementById('timeseries-chart');
    if (!canvas) {
        console.error('차트 캔버스를 찾을 수 없습니다.');
        return;
    }

    // 데이터 준비
    const labels = [];
    const displacements = [];
    const coherences = [];

    timeseriesData.forEach(point => {
        // 날짜
        const formattedDate = formatChartDate(point.date);
        labels.push(formattedDate);

        // 변위 (숫자로 확실히 변환)
        const dispValue = parseFloat(point.displacement);
        displacements.push(isNaN(dispValue) ? null : dispValue);

        // 간섭성 (있으면)
        if (point.coherence !== undefined && point.coherence !== null) {
            const cohValue = parseFloat(point.coherence);
            coherences.push(isNaN(cohValue) ? null : cohValue);
        }
    });

    console.log('차트 labels:', labels.slice(0, 3));
    console.log('차트 displacements:', displacements.slice(0, 3));

    // 데이터셋 구성
    const datasets = [
        {
            label: '변위량 (mm)',
            data: displacements,
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: 'y'
        }
    ];

    // 간섭성 데이터 추가 (있으면)
    if (coherences.length > 0) {
        datasets.push({
            label: '간섭성',
            data: coherences,
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 5,
            yAxisID: 'y1'
        });
    }

    // Chart.js 설정
    const config = {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                title: {
                    display: true,
                    text: '시계열 변위량',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(2);
                                if (context.datasetIndex === 0) {
                                    label += ' mm';
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '날짜'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '변위량 (mm)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    };

    // 간섭성 축 추가 (있으면)
    if (coherences.length > 0) {
        config.options.scales.y1 = {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
                display: true,
                text: '간섭성'
            },
            min: 0,
            max: 1,
            grid: {
                drawOnChartArea: false
            }
        };
    }

    // 차트 생성
    AppState.currentChart = new Chart(canvas, config);

    console.log('✓ 차트 생성 완료');
}

/**
 * 차트용 날짜 포맷팅
 */
function formatChartDate(dateString) {
    if (!dateString) {
        console.warn('formatChartDate: Empty dateString');
        return 'N/A';
    }

    // 문자열로 변환
    const dateStr = String(dateString);

    try {
        // 이미 YYYY-MM-DD 형식인 경우
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateStr;
        }

        // YYYYMMDD 형식인 경우 (8자리 숫자)
        if (dateStr.match(/^\d{8}$/)) {
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            return `${year}-${month}-${day}`;
        }

        // ISO 8601 형식인 경우 (YYYY-MM-DDTHH:MM:SS)
        if (dateStr.includes('T')) {
            return dateStr.split('T')[0];
        }

        // Date 객체로 변환 시도
        const date = new Date(dateStr);

        // Invalid date 체크
        if (isNaN(date.getTime())) {
            console.warn('formatChartDate: Invalid date:', dateStr);
            return dateStr;
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const result = `${year}-${month}-${day}`;

        // NaN 체크
        if (result.includes('NaN')) {
            console.error('formatChartDate: NaN in result:', result, 'from:', dateStr);
            return dateStr;
        }

        return result;
    } catch (e) {
        console.error('formatChartDate 오류:', dateStr, e);
        return String(dateStr);
    }
}

/**
 * 차트 내보내기 (선택사항)
 */
function exportChart() {
    if (!AppState.currentChart) {
        console.warn('내보낼 차트가 없습니다.');
        return;
    }

    const canvas = document.getElementById('timeseries-chart');
    const url = canvas.toDataURL('image/png');

    // 다운로드 링크 생성
    const link = document.createElement('a');
    link.download = 'timeseries_chart.png';
    link.href = url;
    link.click();
}
