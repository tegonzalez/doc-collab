'use client';

import React, { useEffect, useState } from 'react';
import Uppy from '@uppy/core'; // Remove Meta import
import Tus from '@uppy/tus';
import { Dashboard } from '@uppy/react';
// import { DragDrop } from '@uppy/react';
// import { StatusBar } from '@uppy/react';

// Don't forget the Uppy CSS!
// Import dashboard styles
import '@uppy/core/dist/style.min.css';
import '@uppy/dashboard/dist/style.min.css';
// If using DragDrop and StatusBar
// import '@uppy/drag-drop/dist/style.min.css';
// import '@uppy/status-bar/dist/style.min.css';

// Remove MyUppyMeta interface
/*
interface MyUppyMeta extends Meta {
    projectId: string;
    targetFolderPath: string;
    processingStatus: string | null; // Allow string or null
    [key: string]: any; // Index signature to satisfy Meta constraint
}
*/

interface FileUploadProps {
    projectId: string; // Required: ID of the project to upload to
    targetFolderPath?: string; // Optional: Specific folder path within the project
    // Add other props as needed, e.g., allowedFileTypes
}

const FileUpload: React.FC<FileUploadProps> = ({ projectId, targetFolderPath = '.' }) => {
    // IMPORTANT: Initialize Uppy state within useState or useRef to prevent 
    // re-initialization on every render.
    // Revert to simpler useState<Uppy> and cast initializer to any (correct syntax)
    const [uppy] = useState<Uppy>((() => {
        console.log('[Uppy] Initializing Uppy instance...');
        // Remove generic type from constructor
        const instance = new Uppy({
            debug: true,
            autoProceed: false, // Set to true to start uploading immediately after selection
            restrictions: {
                // maxFileSize: 100 * 1024 * 1024, // Example: 100MB (sync with backend)
                // allowedFileTypes: ['.jpg', '.jpeg', '.png', '.pdf', '.md'], // Example
            },
            // Initialize meta with original fields + custom status
            meta: {
                projectId: projectId,
                targetFolderPath: targetFolderPath,
                processingStatus: null, // Add a field for custom status
            },
        });

        instance.use(Tus, {
            endpoint: '/api/upload/tus/', // Ensure trailing slash! Matches backend path.
            retryDelays: [0, 1000, 3000, 5000], // Delays for retrying failed uploads
            chunkSize: 5 * 1024 * 1024, // Optional: Set chunk size (e.g., 5MB)
            removeFingerprintOnSuccess: true, // Recommended: Cleans up localStorage
            // Pass metadata per file (filename is added automatically)
            // Tus plugin gets global meta from Uppy core, but you could add more here if needed
            // metaFields: ['projectId', 'targetFolderPath', 'name', 'type'],
        });

        // --- Event Listeners --- 

        instance.on('file-added', (file) => {
            console.log('[Uppy] File added:', file.name, file.id);
            // You could potentially add/update file-specific metadata here if needed:
            // instance.setFileMeta(file.id, { extraInfo: 'some value' });
        });

        // Add 'any' type to data parameter to resolve TS error - Consider defining a type later
        instance.on('upload', (data: any) => { 
            console.log('[Uppy] Starting upload for files:', data.fileIDs);
            // Update UI state to show 'uploading' if needed
        });

        instance.on('upload-progress', (file, progress) => {
            if (file) { // Check if file is defined
                console.log(
                    // Add nullish coalescing for potentially undefined percentage
                    `[Uppy] Upload progress: ${file.name} - ${progress.bytesUploaded}/${progress.bytesTotal} (${Math.round(progress.percentage ?? 0)}%)`
                );
            }
        });

        instance.on('upload-success', (file, response) => {
            if (file) { // Check if file is defined
                console.log(
                    `[Uppy] Upload success: ${file.name}. Server response:`, 
                    response // Contains uploadURL from Tus
                );
                // IMPORTANT: This only means the *transfer* is complete.
                // The file is now awaiting background processing.
                // Update file status using meta field
                instance.setFileState(file.id, { 
                    progress: { ...file.progress, percentage: 100, uploadComplete: true }, 
                    // Set custom status in meta, re-adding 'as any'
                    meta: { 
                        ...file.meta, 
                        processingStatus: `Processing... (${file.id})` as any
                    }
                });
                // TODO: Update Dashboard UI to display meta.processingStatus
                // Remove the file from the dashboard view after a delay, or based on server signal
                // setTimeout(() => instance.removeFile(file.id), 5000); // Example removal
            }
        });

        instance.on('upload-error', (file, error, response) => {
            if (file) { // Check if file is defined
                console.error(`[Uppy] Upload error for ${file.name}:`, error, response);
                // Update file status using meta field, re-adding 'as any'
                 instance.setFileState(file.id, { 
                    // progress: { ...file.progress }, // Keep existing progress potentially?
                    meta: { 
                        ...file.meta, 
                        processingStatus: `Transfer Error (${file.id})` as any
                    }
                });
                // TODO: Update Dashboard UI to display meta.processingStatus
            } else {
                 console.error(`[Uppy] Upload error (file undefined):`, error, response);
            }
           
        });

        instance.on('complete', (result) => {
            console.log('[Uppy] All uploads complete (transfers finished).');
            console.log('[Uppy] Successful files:', result.successful);
            console.log('[Uppy] Failed files:', result.failed);
            // Now waiting for backend processing signals...
            // Could trigger a UI state change, e.g., hide uploader, show summary
        });

        return instance;
    }) as any); // Correctly place type assertion here

    // Cleanup Uppy instance when component unmounts
    useEffect(() => {
        return () => {
            console.log('[Uppy] Closing Uppy instance.');
            // Use type assertion on the call to uppy.close
            (uppy as any).close({ reason: 'unmount' }); 
        };
    }, [uppy]);

    // --- Render Uppy UI --- 
    // Use the Dashboard UI plugin
    return (
        <div className="file-uploader-container">
            <Dashboard
                uppy={uppy}
                plugins={['DragDrop']} // Optional: Enable DragDrop within the Dashboard
                theme="light" // or 'dark' or 'auto'
                proudlyDisplayPoweredByUppy={false}
                // Note: Displaying custom meta status might require Dashboard customization
                // or using a different UI approach (e.g., StatusBar with custom logic)
                // metaFields={[{ id: 'processingStatus', name: 'Status'}] } // Example, may need more config
            />
            {/* Alternatively, use DragDrop and StatusBar for a more minimal UI 
            <DragDrop uppy={uppy} />
            <StatusBar uppy={uppy} hideUploadButton hideAfterFinish={false} /> 
            <button onClick={() => uppy.upload()}>Upload</button> 
            */}
        </div>
    );
};

export default FileUpload;
