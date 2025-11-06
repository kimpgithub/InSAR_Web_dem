#!/usr/bin/env python3
"""
샘플 InSAR GeoJSON 데이터 생성 스크립트
테스트용으로 한국 지역의 샘플 InSAR 포인트 데이터를 생성합니다.
"""

import json
import random
from datetime import datetime, timedelta

def generate_sample_insar_data(n_points=191, center_lat=37.5, center_lon=127.0):
    """
    샘플 InSAR GeoJSON 데이터 생성

    Parameters:
    -----------
    n_points : int
        생성할 포인트 개수 (기본: 191)
    center_lat : float
        중심 위도 (기본: 37.5 - 서울 인근)
    center_lon : float
        중심 경도 (기본: 127.0)
    """

    print(f"📍 {n_points}개 샘플 InSAR 포인트 생성 중...")

    # 시간 데이터 생성 (20개 씬)
    start_date = datetime(2024, 1, 1)
    dates = []
    for i in range(20):
        date = start_date + timedelta(days=i * 12)  # 12일 간격
        dates.append(date)

    # GeoJSON 구조
    geojson = {
        "type": "FeatureCollection",
        "metadata": {
            "generated": datetime.now().isoformat(),
            "description": "Sample InSAR subsidence data for testing",
            "n_points": n_points,
            "n_acquisitions": len(dates),
            "area": "Seoul metropolitan area",
            "unit": "mm"
        },
        "features": []
    }

    # 포인트 생성
    for i in range(n_points):
        # 랜덤 위치 (중심점 주변 ±0.1도)
        lat = center_lat + random.uniform(-0.1, 0.1)
        lon = center_lon + random.uniform(-0.1, 0.1)

        # 랜덤 속도 (-15 ~ 5 mm/year, 주로 침하)
        velocity = random.gauss(-3, 5)  # 평균 -3, 표준편차 5

        # 시계열 데이터 생성
        timeseries = []
        displacement = 0.0

        for date in dates:
            # 누적 변위 + 약간의 노이즈
            displacement += (velocity / 365.25) * 12 + random.gauss(0, 0.5)

            # 간섭성 (0.5 ~ 1.0)
            coherence = random.uniform(0.6, 0.95)

            timeseries.append({
                "date": date.strftime("%Y-%m-%d"),
                "displacement": round(displacement, 2),
                "coherence": round(coherence, 3)
            })

        # 통계 계산
        displacements = [t["displacement"] for t in timeseries]

        # Feature 생성
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [round(lon, 6), round(lat, 6)]
            },
            "properties": {
                "point_id": f"P{i:03d}",
                "index": i,
                "velocity": round(velocity, 2),
                "timeseries": timeseries,
                "statistics": {
                    "mean_displacement": round(sum(displacements) / len(displacements), 2),
                    "std_displacement": round((sum((d - sum(displacements)/len(displacements))**2 for d in displacements) / len(displacements))**0.5, 2),
                    "max_displacement": round(max(displacements), 2),
                    "min_displacement": round(min(displacements), 2)
                }
            }
        }

        geojson["features"].append(feature)

        if (i + 1) % 50 == 0:
            print(f"  {i + 1}/{n_points} 포인트 생성 완료")

    return geojson


def main():
    print("🌏 InSAR 샘플 데이터 생성 시작\n")

    # 샘플 데이터 생성
    geojson_data = generate_sample_insar_data(n_points=191)

    # 파일 저장
    output_file = "data/processed/sample_insar_points.geojson"

    print(f"\n💾 저장 중: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(geojson_data, f, indent=2, ensure_ascii=False)

    # 파일 크기 확인
    import os
    file_size = os.path.getsize(output_file) / 1024  # KB
    print(f"✅ 완료! 파일 크기: {file_size:.1f} KB")
    print(f"\n📊 데이터 요약:")
    print(f"  - 포인트 개수: {geojson_data['metadata']['n_points']}")
    print(f"  - 시간 포인트: {geojson_data['metadata']['n_acquisitions']}")
    print(f"  - 기간: 2024-01-01 ~ 2024-07-28")

    # 샘플 통계
    velocities = [f["properties"]["velocity"] for f in geojson_data["features"]]
    print(f"\n📈 속도 통계:")
    print(f"  - 평균: {sum(velocities)/len(velocities):.2f} mm/year")
    print(f"  - 최소: {min(velocities):.2f} mm/year")
    print(f"  - 최대: {max(velocities):.2f} mm/year")


if __name__ == '__main__':
    main()
