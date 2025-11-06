#!/usr/bin/env python3
"""
NetCDF to GeoJSON Converter for InSAR Time Series Data

이 스크립트는 InSAR 분석 결과 NetCDF 파일을 웹 시각화를 위한 GeoJSON 포맷으로 변환합니다.

사용법:
    python nc_to_geojson.py <input.nc> [output.geojson]

요구사항:
    - xarray
    - numpy
    - netCDF4 (optional, xarray backend)
"""

import xarray as xr
import numpy as np
import json
import sys
from pathlib import Path
from datetime import datetime


def inspect_netcdf(nc_file):
    """NetCDF 파일 구조 확인"""
    print(f"\n📊 NetCDF 파일 구조 분석: {nc_file}")
    print("=" * 60)

    ds = xr.open_dataset(nc_file)

    print("\n변수 목록:")
    for var in ds.variables:
        shape = ds[var].shape
        dtype = ds[var].dtype
        print(f"  - {var}: {shape} ({dtype})")

    print("\n좌표 목록:")
    for coord in ds.coords:
        shape = ds[coord].shape
        print(f"  - {coord}: {shape}")

    print("\n속성 (Attributes):")
    for attr in ds.attrs:
        print(f"  - {attr}: {ds.attrs[attr]}")

    print("\n" + "=" * 60)

    return ds


def convert_nc_to_geojson(nc_file, output_file=None,
                          lat_var='lat', lon_var='lon',
                          time_var='time', disp_var='displacement',
                          velocity_var='velocity', coherence_var='coherence'):
    """
    NetCDF를 GeoJSON으로 변환

    Parameters:
    -----------
    nc_file : str
        입력 NetCDF 파일 경로
    output_file : str, optional
        출력 GeoJSON 파일 경로 (기본: input.geojson)
    lat_var : str
        위도 변수명 (기본: 'lat')
    lon_var : str
        경도 변수명 (기본: 'lon')
    time_var : str
        시간 변수명 (기본: 'time')
    disp_var : str
        변위 변수명 (기본: 'displacement')
    velocity_var : str, optional
        속도 변수명 (기본: 'velocity')
    coherence_var : str, optional
        간섭성 변수명 (기본: 'coherence')
    """

    print(f"\n🔄 변환 시작: {nc_file}")

    # NetCDF 열기
    ds = xr.open_dataset(nc_file)

    # 출력 파일명 설정
    if output_file is None:
        output_file = Path(nc_file).stem + '.geojson'

    # 변수 확인 및 조정
    available_vars = list(ds.variables.keys())
    print(f"\n사용 가능한 변수: {available_vars}")

    # 좌표 변수 자동 감지
    lat_candidates = ['lat', 'latitude', 'y']
    lon_candidates = ['lon', 'longitude', 'x']

    lat_var = next((v for v in lat_candidates if v in ds.variables), lat_var)
    lon_var = next((v for v in lon_candidates if v in ds.variables), lon_var)

    if lat_var not in ds.variables or lon_var not in ds.variables:
        raise ValueError(f"좌표 변수를 찾을 수 없습니다. 사용 가능: {available_vars}")

    print(f"좌표 변수: lat={lat_var}, lon={lon_var}")

    # 데이터 추출
    lats = ds[lat_var].values
    lons = ds[lon_var].values

    # 시간 데이터 확인
    if time_var in ds.variables or time_var in ds.coords:
        times = ds[time_var].values
        print(f"시간 데이터: {len(times)}개 시점")
    else:
        times = None
        print("⚠️  시간 변수를 찾을 수 없습니다.")

    # 변위 데이터 확인
    if disp_var not in ds.variables:
        # 자동 감지 시도
        disp_candidates = ['displacement', 'disp', 'deformation', 'def', 'phase']
        disp_var = next((v for v in disp_candidates if v in ds.variables), None)

    if disp_var:
        displacement = ds[disp_var].values
        print(f"변위 변수: {disp_var}, shape={displacement.shape}")
    else:
        displacement = None
        print("⚠️  변위 변수를 찾을 수 없습니다.")

    # 속도 데이터 (optional)
    velocity = None
    if velocity_var in ds.variables:
        velocity = ds[velocity_var].values
        print(f"속도 변수: {velocity_var}")

    # 간섭성 데이터 (optional)
    coherence = None
    if coherence_var in ds.variables:
        coherence = ds[coherence_var].values
        print(f"간섭성 변수: {coherence_var}")

    # GeoJSON 생성
    print(f"\n📝 GeoJSON 생성 중...")

    geojson = {
        "type": "FeatureCollection",
        "features": [],
        "metadata": {
            "source": str(nc_file),
            "created": datetime.now().isoformat(),
            "n_points": len(lats),
            "n_times": len(times) if times is not None else 0
        }
    }

    # 각 포인트를 Feature로 변환
    n_points = len(lats)

    for i in range(n_points):
        # 좌표
        lon = float(lons[i]) if lons.ndim == 1 else float(lons.flat[i])
        lat = float(lats[i]) if lats.ndim == 1 else float(lats.flat[i])

        # Properties 구성
        properties = {
            "point_id": f"P{i:03d}",
            "index": i
        }

        # 시계열 데이터
        if displacement is not None and times is not None:
            timeseries = []

            # displacement shape 확인: (time, point) 또는 (point, time)
            if displacement.ndim == 2:
                if displacement.shape[0] == len(times):
                    # (time, point)
                    disp_series = displacement[:, i]
                else:
                    # (point, time)
                    disp_series = displacement[i, :]
            elif displacement.ndim == 1:
                # 단일 시점
                disp_series = [displacement[i]]
            else:
                disp_series = []

            for t_idx, time_val in enumerate(times):
                if t_idx < len(disp_series):
                    # numpy datetime64를 문자열로 변환
                    if hasattr(time_val, 'astype'):
                        time_str = str(np.datetime64(time_val, 'D'))
                    else:
                        time_str = str(time_val)

                    ts_point = {
                        "date": time_str,
                        "displacement": float(disp_series[t_idx]) if not np.isnan(disp_series[t_idx]) else None
                    }

                    # 간섭성 데이터 추가 (있다면)
                    if coherence is not None:
                        if coherence.ndim == 2:
                            if coherence.shape[0] == len(times):
                                coh_val = coherence[t_idx, i]
                            else:
                                coh_val = coherence[i, t_idx]
                        else:
                            coh_val = coherence[i] if coherence.ndim == 1 else None

                        if coh_val is not None:
                            ts_point["coherence"] = float(coh_val) if not np.isnan(coh_val) else None

                    timeseries.append(ts_point)

            properties["timeseries"] = timeseries

            # 통계 계산
            valid_disp = disp_series[~np.isnan(disp_series)]
            if len(valid_disp) > 0:
                properties["statistics"] = {
                    "mean_displacement": float(np.mean(valid_disp)),
                    "std_displacement": float(np.std(valid_disp)),
                    "max_displacement": float(np.max(valid_disp)),
                    "min_displacement": float(np.min(valid_disp))
                }

        # 속도 데이터 추가
        if velocity is not None:
            vel_val = velocity[i] if velocity.ndim == 1 else velocity.flat[i]
            if not np.isnan(vel_val):
                properties["velocity"] = float(vel_val)

        # Feature 생성
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat]
            },
            "properties": properties
        }

        geojson["features"].append(feature)

        # 진행상황 표시
        if (i + 1) % 50 == 0 or (i + 1) == n_points:
            print(f"  진행: {i + 1}/{n_points} 포인트 처리 완료")

    # 파일 저장
    print(f"\n💾 저장 중: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, indent=2, ensure_ascii=False)

    file_size = Path(output_file).stat().st_size / 1024  # KB
    print(f"✅ 완료! 파일 크기: {file_size:.1f} KB")

    ds.close()

    return output_file


def main():
    if len(sys.argv) < 2:
        print("사용법: python nc_to_geojson.py <input.nc> [output.geojson]")
        print("\n먼저 NetCDF 파일 구조를 확인하려면:")
        print("  python nc_to_geojson.py --inspect <input.nc>")
        sys.exit(1)

    if sys.argv[1] == '--inspect':
        if len(sys.argv) < 3:
            print("사용법: python nc_to_geojson.py --inspect <input.nc>")
            sys.exit(1)
        inspect_netcdf(sys.argv[2])
        sys.exit(0)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    # 파일 존재 확인
    if not Path(input_file).exists():
        print(f"❌ 오류: 파일을 찾을 수 없습니다: {input_file}")
        sys.exit(1)

    try:
        convert_nc_to_geojson(input_file, output_file)
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        print("\n💡 Tip: --inspect 옵션으로 파일 구조를 먼저 확인해보세요:")
        print(f"  python nc_to_geojson.py --inspect {input_file}")
        sys.exit(1)


if __name__ == '__main__':
    main()
