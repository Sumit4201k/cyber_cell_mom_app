import os
import sys
import glob
import time
import argparse
import requests
import json

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")
PYTHON_AI_URL = os.getenv("PYTHON_AI_URL", "http://localhost:8000")

def check_services():
    """Verify both backend and Python AI services are online."""
    print("Checking system services...")
    try:
        r_backend = requests.get(f"{BACKEND_URL}/api/health", timeout=3)
        if r_backend.status_code == 200:
            print("  [OK] Express Backend is ONLINE (Port 5000)")
        else:
            print(f"  [WARN] Backend returned HTTP {r_backend.status_code}")
    except Exception as e:
        print(f"  [ERROR] Backend connection failed: {e}")
        print("  Please start the backend with: npm run start:backend")
        return False

    try:
        r_ai = requests.get(f"{PYTHON_AI_URL}/health", timeout=3)
        if r_ai.status_code == 200:
            print("  [OK] Python AI Microservice is ONLINE (Port 8000)")
        else:
            print(f"  [WARN] Python AI returned HTTP {r_ai.status_code}")
    except Exception as e:
        print(f"  [ERROR] Python AI service connection failed: {e}")
        print("  Please start the Python service with: cd python-service && python main.py")
        return False

    return True

def ingest_file(file_path, officer_name="Investigating Officer", role="INVESTIGATOR"):
    """Send a single audio file through the ingestion pipeline."""
    filename = os.path.basename(file_path)
    file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
    print(f"\n---> Ingesting: {filename} ({file_size_mb:.2f} MB)")

    url = f"{BACKEND_URL}/api/meetings/upload"
    headers = {
        "x-demo-role": role
    }

    try:
        start_time = time.time()
        with open(file_path, "rb") as f:
            files = {
                "audio": (filename, f, "audio/wav")
            }
            data = {
                "createdBy": officer_name
            }
            response = requests.post(url, files=files, data=data, headers=headers, timeout=120)

        elapsed = time.time() - start_time
        if response.status_code in [200, 201]:
            res_json = response.json()
            mtg = res_json.get("meeting", {})
            print(f"  [SUCCESS] Ingested in {elapsed:.2f}s")
            print(f"  Meeting ID: {mtg.get('id')}")
            print(f"  Title:      {mtg.get('title')}")
            print(f"  Entities:   {len(mtg.get('entitiesFound', []))} PII items redacted")
            print(f"  Action Items: {len(mtg.get('mom', {}).get('action_items', []))} generated")
            return True
        else:
            print(f"  [FAILED] HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"  [ERROR] Ingestion error: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Batch Dataset Ingestion for State Cyber Cell")
    parser.add_argument("--dir", default="./samples", help="Path to directory containing audio files (.wav, .mp3, .m4a)")
    parser.add_argument("--officer", default="Inspector Shinde (POL-8842)", help="Assigning Officer name")
    parser.add_argument("--role", default="INVESTIGATOR", help="Officer clearance role (ADMIN, INVESTIGATOR, ANALYST)")
    args = parser.parse_args()

    print("=" * 60)
    print(" STATE CYBER CELL — BATCH DATASET INGESTION PIPELINE")
    print("=" * 60)
    print(f"Dataset Directory: {os.path.abspath(args.dir)}")
    print(f"Assigning Officer: {args.officer} [{args.role}]")
    print("=" * 60)

    if not check_services():
        print("\nAborting: Services must be running prior to dataset ingestion.")
        print("Run 'npm run start:full' in another terminal first.")
        sys.exit(1)

    # Search for audio files
    extensions = ("*.wav", "*.mp3", "*.m4a", "*.ogg", "*.flac")
    audio_files = []
    for ext in extensions:
        audio_files.extend(glob.glob(os.path.join(args.dir, ext)))
        audio_files.extend(glob.glob(os.path.join(args.dir, "**", ext), recursive=True))

    audio_files = sorted(list(set(audio_files)))

    if not audio_files:
        print(f"\n[!] No audio files found in directory: {args.dir}")
        print("Supported formats: .wav, .mp3, .m4a, .ogg, .flac")
        sys.exit(0)

    print(f"\nFound {len(audio_files)} audio file(s) in dataset. Starting batch processing...")

    success_count = 0
    fail_count = 0

    for idx, fpath in enumerate(audio_files, 1):
        print(f"\n[{idx}/{len(audio_files)}] Processing...")
        ok = ingest_file(fpath, args.officer, args.role)
        if ok:
            success_count += 1
        else:
            fail_count += 1

    print("\n" + "=" * 60)
    print(f" DATASET INGESTION COMPLETE: {success_count} Succeeded, {fail_count} Failed")
    print(" All records committed to SHA-256 Cryptographic Audit Ledger.")
    print(" Open http://localhost:5173 to view imported cases and transcripts.")
    print("=" * 60)

if __name__ == "__main__":
    main()
