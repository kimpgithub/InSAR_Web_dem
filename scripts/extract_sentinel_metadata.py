#!/usr/bin/env python3
"""
Sentinel-1 메타데이터 추출 스크립트

.SAFE 폴더에서 Sentinel-1 메타데이터를 추출하여 JSON 파일로 저장합니다.

사용법:
    python extract_sentinel_metadata.py <.SAFE 폴더 경로> [출력.json]
    python extract_sentinel_metadata.py <.SAFE 폴더들이 있는 디렉토리> --batch
"""

import xml.etree.ElementTree as ET
from pathlib import Path
import json
import sys
from datetime import datetime
import re


def parse_safe_filename(safe_name):
    """
    SAFE 파일명에서 메타데이터 추출
    예: S1A_IW_SLC__1SDV_20240927T093227_20240927T093253_055849_06D358_5184.SAFE
    """
    parts = safe_name.replace('.SAFE', '').split('_')

    if len(parts) < 9:
        return None

    metadata = {
        "mission": parts[0],  # S1A or S1B
        "mode": parts[1],     # IW
        "product": parts[2],  # SLC
        "polarization": parts[4],  # 1SDV, 1SSV, etc
        "start_time": parts[5],
        "stop_time": parts[6],
        "orbit_number": parts[7],
        "data_take_id": parts[8],
        "product_id": parts[9] if len(parts) > 9 else None
    }

    # 날짜/시간 파싱
    try:
        start_dt = datetime.strptime(metadata["start_time"], "%Y%m%dT%H%M%S")
        metadata["date"] = start_dt.strftime("%Y-%m-%d")
        metadata["time"] = start_dt.strftime("%H:%M:%S")
    except:
        metadata["date"] = "Unknown"
        metadata["time"] = "Unknown"

    return metadata


def extract_manifest_metadata(safe_path):
    """
    manifest.safe 파일에서 상세 메타데이터 추출
    """
    manifest_file = safe_path / "manifest.safe"

    if not manifest_file.exists():
        print(f"⚠️  manifest.safe를 찾을 수 없습니다: {safe_path}")
        return {}

    try:
        tree = ET.parse(manifest_file)
        root = tree.getroot()

        # XML 네임스페이스
        namespaces = {
            'safe': 'http://www.esa.int/safe/sentinel-1.0',
            's1': 'http://www.esa.int/safe/sentinel-1.0/sentinel-1',
            'xfdu': 'urn:ccsds:schema:xfdu:1'
        }

        metadata = {}

        # 궤도 정보 (ascending/descending)
        try:
            orbit_elem = root.find('.//s1:pass', namespaces)
            if orbit_elem is not None:
                metadata["orbit_direction"] = orbit_elem.text.lower()
        except:
            pass

        # 좌표 정보
        try:
            coords_elem = root.find('.//gml:coordinates', {'gml': 'http://www.opengis.net/gml'})
            if coords_elem is not None:
                coords_text = coords_elem.text.strip()
                # 좌표 파싱 (예: "lat1,lon1 lat2,lon2 ...")
                coord_pairs = coords_text.split()
                if len(coord_pairs) >= 4:
                    lats = []
                    lons = []
                    for pair in coord_pairs:
                        lat, lon = map(float, pair.split(','))
                        lats.append(lat)
                        lons.append(lon)

                    metadata["bounds"] = {
                        "north": max(lats),
                        "south": min(lats),
                        "east": max(lons),
                        "west": min(lons)
                    }
        except Exception as e:
            print(f"  좌표 추출 실패: {e}")

        return metadata

    except Exception as e:
        print(f"⚠️  manifest.safe 파싱 오류: {e}")
        return {}


def get_tiff_info(safe_path):
    """
    .SAFE 폴더 내 TIFF 파일 정보
    """
    measurement_dir = safe_path / "measurement"

    if not measurement_dir.exists():
        return []

    tiff_files = list(measurement_dir.glob("*.tiff")) + list(measurement_dir.glob("*.tif"))

    tiff_info = []
    for tiff in tiff_files:
        tiff_info.append({
            "filename": tiff.name,
            "size_mb": tiff.stat().st_size / (1024 * 1024),
            "path": str(tiff.relative_to(safe_path))
        })

    return tiff_info


def extract_metadata_from_safe(safe_path):
    """
    단일 .SAFE 폴더에서 메타데이터 추출
    """
    safe_path = Path(safe_path)

    if not safe_path.exists():
        raise FileNotFoundError(f"폴더를 찾을 수 없습니다: {safe_path}")

    print(f"\n📡 처리 중: {safe_path.name}")

    # 파일명에서 기본 메타데이터 추출
    metadata = parse_safe_filename(safe_path.name)

    if metadata is None:
        print(f"⚠️  올바른 SAFE 파일명이 아닙니다: {safe_path.name}")
        metadata = {"id": safe_path.name}
    else:
        metadata["id"] = safe_path.name

    # manifest.safe에서 추가 정보
    manifest_metadata = extract_manifest_metadata(safe_path)
    metadata.update(manifest_metadata)

    # TIFF 파일 정보
    tiff_files = get_tiff_info(safe_path)
    if tiff_files:
        metadata["tiff_files"] = tiff_files
        print(f"  ✓ TIFF 파일 {len(tiff_files)}개 발견")

    # 썸네일 경로 (추후 생성용)
    metadata["thumbnail"] = None  # 나중에 생성

    return metadata


def batch_extract(directory, output_file="sentinel_list.json"):
    """
    디렉토리 내 모든 .SAFE 폴더에서 메타데이터 일괄 추출
    """
    directory = Path(directory)

    # .SAFE 폴더 찾기
    safe_folders = list(directory.glob("*.SAFE"))

    if not safe_folders:
        safe_folders = list(directory.glob("*/*.SAFE"))

    if not safe_folders:
        print(f"❌ .SAFE 폴더를 찾을 수 없습니다: {directory}")
        return

    print(f"\n📂 {len(safe_folders)}개의 SAFE 폴더 발견")

    sentinel_data = []

    for safe_folder in sorted(safe_folders):
        try:
            metadata = extract_metadata_from_safe(safe_folder)
            sentinel_data.append(metadata)
        except Exception as e:
            print(f"  ❌ 오류: {e}")

    # JSON 저장
    output = {
        "sentinel_data": sentinel_data,
        "metadata": {
            "total_scenes": len(sentinel_data),
            "created": datetime.now().isoformat(),
            "source_directory": str(directory)
        }
    }

    output_path = directory / output_file if not Path(output_file).is_absolute() else Path(output_file)

    print(f"\n💾 저장 중: {output_path}")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"✅ 완료! {len(sentinel_data)}개 씬 메타데이터 추출")

    return output_path


def main():
    if len(sys.argv) < 2:
        print("사용법:")
        print("  1. 단일 SAFE 폴더: python extract_sentinel_metadata.py <path/to/xxx.SAFE>")
        print("  2. 일괄 처리: python extract_sentinel_metadata.py <directory> --batch")
        sys.exit(1)

    input_path = Path(sys.argv[1])

    # 일괄 처리 모드
    if '--batch' in sys.argv or input_path.is_dir():
        if input_path.is_dir():
            batch_extract(input_path)
        else:
            print("❌ --batch 옵션은 디렉토리 경로가 필요합니다.")
            sys.exit(1)
    else:
        # 단일 폴더 처리
        try:
            metadata = extract_metadata_from_safe(input_path)

            output_file = sys.argv[2] if len(sys.argv) > 2 else f"{input_path.stem}_metadata.json"

            print(f"\n💾 저장 중: {output_file}")
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)

            print("✅ 완료!")

        except Exception as e:
            print(f"❌ 오류: {e}")
            sys.exit(1)


if __name__ == '__main__':
    main()
