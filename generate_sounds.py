import wave
import struct
import math
import os

def generate_beep(filename, freq=440, duration=0.1, volume=0.5):
    sample_rate = 44100
    num_samples = int(duration * sample_rate)
    
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        for i in range(num_samples):
            # Fade out to prevent clicking
            envelope = math.exp(-3 * i / num_samples)
            value = int(volume * 32767.0 * envelope * math.sin(2.0 * math.pi * freq * i / sample_rate))
            data = struct.pack('<h', value)
            wav_file.writeframesraw(data)

# Generate a high-pitched quick pop for "sent"
generate_beep("assets/sounds/sent.wav", freq=880, duration=0.15)
# Generate a slightly lower two-tone for "received"
generate_beep("assets/sounds/received.wav", freq=660, duration=0.2)

print("Sounds generated in assets/sounds/")
