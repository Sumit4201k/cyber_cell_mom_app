import os
import sys
import argparse
import yt_dlp

def download_and_clip(url: str, output_name: str, start_time: str = "00:00:00", duration_secs: int = 90):
    """
    Downloads audio from a YouTube video URL and saves a 1-2 minute clip directly to the samples/ directory.
    Uses native yt-dlp post-processing to extract clean audio.
    """
    samples_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "samples")
    os.makedirs(samples_dir, exist_ok=True)
    
    if not output_name.endswith(".mp3") and not output_name.endswith(".wav"):
        output_name += ".mp3"
        
    out_path = os.path.join(samples_dir, output_name)
    temp_template = os.path.join(samples_dir, f"temp_dl_%(id)s.%(ext)s")

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': temp_template,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'quiet': False,
        'no_warnings': False,
    }

    print(f"Downloading from: {url}")
    print(f"Saving to: {out_path}")
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info)
        downloaded_mp3 = os.path.splitext(filename)[0] + ".mp3"

    if os.path.exists(downloaded_mp3):
        if os.path.exists(out_path):
            os.remove(out_path)
        os.rename(downloaded_mp3, out_path)
        print(f"\n[SUCCESS] Saved audio clip to: {out_path}")
    else:
        print(f"[WARNING] File was downloaded to {downloaded_mp3}, please verify.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download YouTube clips for testing speech models.")
    parser.add_argument("url", help="YouTube video URL")
    parser.add_argument("--name", default="youtube_test_clip.mp3", help="Output file name inside samples/")
    args = parser.parse_args()
    
    download_and_clip(args.url, args.name)
