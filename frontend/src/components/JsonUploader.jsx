import { useRef } from 'react';

export default function JsonUploader({ onJsonLoaded }) {
    const fileInputRef = useRef(null);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                onJsonLoaded(json);
            } catch {
                alert('Invalid JSON file. Please upload a valid JSON file.');
            }
        };
        reader.readAsText(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target.result);
                    onJsonLoaded(json);
                } catch {
                    alert('Invalid JSON file.');
                }
            };
            reader.readAsText(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    return (
        <div
            className="upload-zone"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <div className="upload-icon">📁</div>
            <p>Drop a JSON file here or click to upload</p>
            <p className="upload-hint">Supports architecture JSON format</p>
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
            />
        </div>
    );
}
