const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Configuration
const API_URL = 'http://localhost:4000/api';
const CAMERA_DIR = path.join(__dirname, 'camera_uploads');

// Ensure camera directory exists
if (!fs.existsSync(CAMERA_DIR)) {
    fs.mkdirSync(CAMERA_DIR, { recursive: true });
}

async function uploadImage(imagePath, cameraName) {
    try {
        // Validate camera name
        if (!cameraName || cameraName === 'default') {
            throw new Error('Please provide a valid camera name (not "default")');
        }

        // Check if file exists
        if (!fs.existsSync(imagePath)) {
            throw new Error(`File not found: ${imagePath}`);
        }

        // Check if file is a JPEG
        if (!imagePath.toLowerCase().endsWith('.jpg') && !imagePath.toLowerCase().endsWith('.jpeg')) {
            throw new Error('Only JPEG files are allowed');
        }

        // Create form data
        const formData = new FormData();
        formData.append('image', fs.createReadStream(imagePath));
        formData.append('camera', cameraName);

        console.log(`Uploading to camera: ${cameraName}`);

        // Upload file
        const response = await axios.post(`${API_URL}/upload`, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        if (response.data.success) {
            console.log('Upload successful:', {
                camera: cameraName,
                filename: response.data.filename,
                timestamp: new Date(parseInt(response.data.filename.split('.')[0])).toLocaleString()
            });
        } else {
            throw new Error('Upload failed: ' + JSON.stringify(response.data));
        }

        return response.data;
    } catch (error) {
        console.error('Upload failed:', error.message);
        throw error;
    }
}

// Example usage
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length !== 2) {
        console.log('Usage: node upload.js <image_path> <camera_name>');
        console.log('Example: node upload.js upload/img.jpg cam1');
        process.exit(1);
    }

    const [imagePath, cameraName] = args;
    uploadImage(imagePath, cameraName)
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error.message);
            process.exit(1);
        });
}

module.exports = { uploadImage }; 