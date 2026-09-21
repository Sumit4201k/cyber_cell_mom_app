"""
Model Pre-warmer & Cache Loader for Whisper Hindi, Gujarati, and English
Pre-caches CTranslate2 INT8 model weights offline so the first transcription executes immediately.
"""
import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "python-service"))
from pipeline.transcribe import SingleActiveModelManager

def preload():
    print("=" * 65)
    print("PRE-CACHING INT8 WHISPER SPEECH MODELS (EN, HI, GU)")
    print("=" * 65)
    manager = SingleActiveModelManager.get_instance()
    
    print("\n[1/2] Pre-loading English / Multilingual Model...")
    model_en = manager.get_model("en")
    print("  [OK] English/Multilingual model cached successfully.")
    
    print("\n[2/2] Pre-loading Hindi / Indic Model...")
    model_hi = manager.get_model("hi")
    print("  [OK] Hindi/Indic model cached successfully.")
    
    manager.evict_active_model()
    print("\n" + "=" * 65)
    print("ALL SPEECH MODELS CACHED OFFLINE FOR ZERO-LATENCY INFERENCE!")
    print("=" * 65)

if __name__ == "__main__":
    preload()
