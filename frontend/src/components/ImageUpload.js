import React, { useState } from 'react';
import { Camera, Trash2, Loader2, User as UserIcon } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const ImageUpload = ({ entityId, currentImage, onUpdate, isAdmin = false }) => {
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation
        if (!file.type.startsWith('image/')) {
            return toast.error('Please upload an image file');
        }
        if (file.size > 2 * 1024 * 1024) {
            return toast.error('Image size must be less than 2MB');
        }

        const formData = new FormData();
        formData.append('photo', file);

        setUploading(true);
        try {
            const endpoint = isAdmin ? `/api/admin/users/${entityId}/photo` : `/api/users/photo`;
            const { data } = await api.put(endpoint, formData);
            
            toast.success('Photo updated successfully');
            if (onUpdate) onUpdate(data.profile_pic);
        } catch (err) {
            console.error('Upload error:', err);
            toast.error(err.response?.data?.message || 'Failed to upload photo');
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = async () => {
        if (!window.confirm('Are you sure you want to remove this photo?')) return;

        setUploading(true);
        try {
            const endpoint = isAdmin ? `/api/admin/users/${entityId}/photo` : `/api/users/photo`;
            await api.delete(endpoint);
            toast.success('Photo removed');
            if (onUpdate) onUpdate(null);
        } catch (err) {
            console.error('Removal error:', err);
            toast.error('Failed to remove photo');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <div className="w-32 h-32 rounded-2xl overflow-hidden bg-bg-surface-light border-2 border-border-subtle group-hover:border-primary/50 transition-all shadow-xl">
                    {currentImage ? (
                        <img 
                            src={currentImage} 
                            alt="Profile" 
                            className="w-full h-full object-cover animate-fade-in"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-dim/20 bg-gradient-to-br from-bg-surface-light to-bg-surface">
                            <UserIcon size={64} />
                        </div>
                    )}
                    
                    {uploading && (
                        <div className="absolute inset-0 bg-bg-deep/60 backdrop-blur-sm flex items-center justify-center z-10">
                            <Loader2 className="animate-spin text-primary" size={24} />
                        </div>
                    )}
                </div>

                <label className="absolute -bottom-2 -right-2 p-2 bg-primary text-white rounded-lg shadow-lg cursor-pointer hover:bg-accent hover:scale-110 transition-all active:scale-95">
                    <Camera size={18} />
                    <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                </label>
            </div>

            {currentImage && (
                <button
                    onClick={handleRemove}
                    disabled={uploading}
                    className="flex items-center gap-2 text-[10px] font-bold text-danger/60 hover:text-danger uppercase tracking-widest transition-colors"
                >
                    <Trash2 size={12} />
                    Remove Photo
                </button>
            )}
        </div>
    );
};

export default ImageUpload;
