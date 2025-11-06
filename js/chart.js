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
        labels.push(formatChartDate(point.date));

        // 변위
        displacements.push(point.displacement !== null ? point.displacement : null);

        // 간섭성 (있으면)
        if (point.coherence !== undefined) {
            coherences.push(point.coherence);
        }
    });

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
