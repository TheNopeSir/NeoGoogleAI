
import React, { useRef, useEffect, useState } from 'react';
import { X, Download, RefreshCw } from 'lucide-react';
import { Exhibit, UserProfile } from '../types';

interface ShareCardModalProps {
    exhibit: Exhibit;
    user: UserProfile | null;
    onClose: () => void;
}

const ShareCardModal: React.FC<ShareCardModalProps> = ({ exhibit, user, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isGenerating, setIsGenerating] = useState(true);

    const generateCard = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsGenerating(true);

        // CONFIG
        const W = 600;
        const H = 800;
        canvas.width = W;
        canvas.height = H;

        // 1. Background
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, W, H);

        // Grid Pattern
        ctx.strokeStyle = '#003300';
        ctx.lineWidth = 1;
        for (let i = 0; i < W; i += 40) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
        }
        for (let i = 0; i < H; i += 40) {
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
        }

        // 2. Load Image
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = exhibit.imageUrls[0];
        
        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve; // Continue even if image fails
        });

        // Draw Image (Grayscale + Green Tint)
        const imgH = 350;
        ctx.save();
        ctx.beginPath();
        ctx.rect(40, 120, W - 80, imgH);
        ctx.clip();
        
        // Scale image to cover
        const ratio = Math.max((W - 80) / img.width, imgH / img.height);
        const centerShift_x = (W - 80 - img.width * ratio) / 2;
        const centerShift_y = (imgH - img.height * ratio) / 2;
        ctx.drawImage(img, 0, 0, img.width, img.height, 40 + centerShift_x, 120 + centerShift_y, img.width * ratio, img.height * ratio);
        
        // Green Overlay
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(40, 120, W - 80, imgH);
        
        // Scanlines
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        for (let i = 120; i < 120 + imgH; i += 4) {
            ctx.fillRect(40, i, W - 80, 2);
        }
        ctx.restore();

        // Image Border
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 120, W - 80, imgH);

        // Corner Markers
        const cornerSize = 15;
        ctx.lineWidth = 4;
        ctx.beginPath();
        // TL
        ctx.moveTo(35, 115 + cornerSize); ctx.lineTo(35, 115); ctx.lineTo(35 + cornerSize, 115);
        // TR
        ctx.moveTo(W - 35 - cornerSize, 115); ctx.lineTo(W - 35, 115); ctx.lineTo(W - 35, 115 + cornerSize);
        // BL
        ctx.moveTo(35, 125 + imgH - cornerSize); ctx.lineTo(35, 125 + imgH); ctx.lineTo(35 + cornerSize, 125 + imgH);
        // BR
        ctx.moveTo(W - 35 - cornerSize, 125 + imgH); ctx.lineTo(W - 35, 125 + imgH); ctx.lineTo(W - 35, 125 + imgH - cornerSize);
        ctx.stroke();

        // 3. Typography
        ctx.font = 'bold 30px "Courier New", monospace';
        ctx.fillStyle = '#00ff00';
        ctx.textAlign = 'center';
        ctx.fillText("NEO_ARCHIVE // DOSSIER", W / 2, 60);

        ctx.font = '16px "Courier New", monospace';
        ctx.fillText(`ID: ${exhibit.id.slice(0, 8).toUpperCase()}`, W / 2, 90);

        // Stamps
        ctx.save();
        ctx.translate(W - 100, 100);
        ctx.rotate(Math.PI / 6);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.lineWidth = 4;
        ctx.strokeRect(-60, -20, 120, 40);
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillText("TOP SECRET", 0, 5);
        ctx.restore();

        // Data Fields
        ctx.textAlign = 'left';
        const startY = 520;
        const lineHeight = 30;

        const drawField = (label: string, value: string, y: number) => {
            ctx.font = 'bold 14px "Courier New", monospace';
            ctx.fillStyle = '#00aa00';
            ctx.fillText(label, 50, y);
            ctx.fillStyle = '#ccffcc';
            ctx.fillText(value.toUpperCase().substring(0, 40), 200, y);
        };

        drawField("SUBJECT:", exhibit.title, startY);
        drawField("CLASS:", exhibit.category, startY + lineHeight);
        drawField("OWNER:", `@${exhibit.owner}`, startY + lineHeight * 2);
        drawField("STATUS:", exhibit.tradeStatus || "SECURE", startY + lineHeight * 3);
        drawField("DATE:", new Date().toLocaleDateString(), startY + lineHeight * 4);

        // Barcode (Simulated)
        const barcodeY = H - 80;
        ctx.fillStyle = '#fff';
        ctx.fillRect(50, barcodeY, W - 100, 40);
        ctx.fillStyle = '#000';
        for (let i = 50; i < W - 50; i += 5) {
            if (Math.random() > 0.3) {
                ctx.fillRect(i, barcodeY, Math.random() * 3 + 1, 40);
            }
        }

        ctx.font = '10px monospace';
        ctx.fillStyle = '#00ff00';
        ctx.textAlign = 'center';
        ctx.fillText("GENERATED BY NEO_ARCHIVE PROTOCOL v5.5", W / 2, H - 20);

        setIsGenerating(false);
    };

    useEffect(() => {
        generateCard();
    }, [exhibit]);

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `dossier_${exhibit.id.slice(0,6)}.png`;
        link.href = canvas.toDataURL();
        link.click();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#111] border border-green-500/50 p-4 rounded-xl max-w-lg w-full flex flex-col gap-4 shadow-[0_0_50px_rgba(0,255,0,0.1)]">
                <div className="flex justify-between items-center text-green-500 border-b border-green-500/30 pb-2">
                    <h3 className="font-pixel text-xs tracking-widest">ГЕНЕРАТОР ДОСЬЕ</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                
                <div className="relative aspect-[3/4] bg-black border border-white/10 w-full flex items-center justify-center overflow-hidden">
                    <canvas ref={canvasRef} className="max-w-full max-h-full" />
                    {isGenerating && <div className="absolute inset-0 bg-black flex items-center justify-center text-green-500 font-mono animate-pulse">COMPILING DATA...</div>}
                </div>

                <div className="flex gap-2">
                    <button onClick={generateCard} className="p-3 border border-green-500/30 text-green-500 rounded hover:bg-green-500/10"><RefreshCw size={20}/></button>
                    <button onClick={handleDownload} className="flex-1 py-3 bg-green-600 text-black font-bold font-pixel text-xs rounded hover:bg-green-500 flex items-center justify-center gap-2">
                        <Download size={16}/> DOWNLOAD_DOSSIER.PNG
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareCardModal;
