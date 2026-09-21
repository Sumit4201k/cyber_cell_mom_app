import os
import sys
import av
import yt_dlp

SAMPLES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "samples")
os.makedirs(SAMPLES_DIR, exist_ok=True)

CATEGORIES = [
    {
        "query": "ytsearch1:the ranveer show startup founder hindi podcast",
        "output_filename": "sample_youtube_hinglish_podcast.wav",
        "label": "Hinglish Tech Startup Podcast",
        "start_sec": 60,
        "duration_sec": 75
    },
    {
        "query": "ytsearch1:mihir's mic gujarati podcast interview",
        "output_filename": "sample_youtube_gujarati_podcast.wav",
        "label": "Gujarati Podcast & Interview",
        "start_sec": 60,
        "duration_sec": 75
    },
    {
        "query": "ytsearch1:hasgeek india developer talk keynote english",
        "output_filename": "sample_youtube_indian_english.wav",
        "label": "Indian English Tech Conference Talk",
        "start_sec": 45,
        "duration_sec": 75
    }
]

def slice_audio_pyav(src_path: str, dst_path: str, start_sec: float, duration_sec: float):
    """
    Slices audio cleanly from start_sec for duration_sec, resampling to 16kHz mono WAV for Whisper.
    """
    input_container = av.open(src_path)
    input_stream = input_container.streams.audio[0]

    output_container = av.open(dst_path, mode='w', format='wav')
    output_stream = output_container.add_stream('pcm_s16le', rate=16000)
    output_stream.layout = 'mono'

    resampler = av.AudioResampler(format='s16', layout='mono', rate=16000)

    end_sec = start_sec + duration_sec
    sample_rate = input_stream.rate or 44100

    input_container.seek(int(start_sec * 1000000), any_frame=False, backward=True)

    for frame in input_container.decode(input_stream):
        frame_time = float(frame.pts * frame.time_base)
        if frame_time < start_sec:
            continue
        if frame_time > end_sec:
            break

        for resampled_frame in resampler.resample(frame):
            for packet in output_stream.encode(resampled_frame):
                output_container.mux(packet)

    for packet in output_stream.encode(None):
        output_container.mux(packet)

    input_container.close()
    output_container.close()

def main():
    print("=" * 65)
    print("Fetching YouTube Audio Samples (Hinglish, Gujarati, Indian English)")
    print("=" * 65)

    for item in CATEGORIES:
        print(f"\n[SEARCH & DOWNLOAD] {item['label']} -> {item['query']}")
        temp_file = os.path.join(SAMPLES_DIR, f"temp_{item['output_filename']}.m4a")
        target_wav = os.path.join(SAMPLES_DIR, item['output_filename'])

        ydl_opts = {
            'format': 'bestaudio[ext=m4a]/bestaudio/best',
            'outtmpl': temp_file,
            'quiet': True,
            'no_warnings': True,
            'default_search': 'ytsearch1'
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(item['query'], download=True)
                entries = info.get('entries', [info])
                title = entries[0].get('title', 'Unknown Title') if entries else 'Unknown'
                print(f"  Found Video: '{title}'")

            actual_dl = temp_file
            if not os.path.exists(actual_dl):
                # Search for any file created with prefix
                for f in os.listdir(SAMPLES_DIR):
                    if f.startswith(f"temp_{item['output_filename']}"):
                        actual_dl = os.path.join(SAMPLES_DIR, f)
                        break

            if os.path.exists(actual_dl):
                print(f"  Extracting {item['duration_sec']}s clip from {item['start_sec']}s -> {target_wav}...")
                slice_audio_pyav(actual_dl, target_wav, item['start_sec'], item['duration_sec'])
                os.remove(actual_dl)
                print(f"  [DONE] Saved: {target_wav} ({os.path.getsize(target_wav)} bytes)")
            else:
                print(f"  [ERROR] Downloaded file not found for {item['label']}")

        except Exception as e:
            print(f"  [FAILED] Error processing {item['label']}: {e}")

    print("\n" + "=" * 65)
    print("All YouTube Samples Downloaded and Sliced into samples/ Directory!")
    print("=" * 65)

if __name__ == "__main__":
    main()
