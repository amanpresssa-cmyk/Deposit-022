from PIL import Image

def remove_white_background(image_path, output_path, tolerance=50):
    img = Image.open(image_path).convert("RGBA")
    data = img.getdata()

    new_data = []
    for item in data:
        # Check if the pixel is close to white (255, 255, 255)
        if item[0] >= 255 - tolerance and item[1] >= 255 - tolerance and item[2] >= 255 - tolerance:
            # Change to transparent
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)

    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"Saved transparent image to {output_path}")

if __name__ == "__main__":
    import os
    logo_path = r"assets\images\logo.png"
    if os.path.exists(logo_path):
        remove_white_background(logo_path, logo_path)
    else:
        print("Logo not found.")
