# Feature: Robust File Upload System

## 1. Overview

This document outlines the technical design for implementing a robust, user-friendly file upload system within the CollabFlow application. The goal is to replace the current basic upload mechanism with a solution that supports multiple file uploads, provides visual progress feedback, and allows for resumable uploads to handle network interruptions, particularly for larger files.

This feature addresses requirements outlined in the project blueprint (3.1.1.1) and MVP (3.1.1.1) regarding secure file uploads with progress tracking and integrates insights from user notes regarding upload context.

## 2. Goals

- Allow users to select and upload multiple files simultaneously.
- Provide clear visual feedback for each file's upload progress.
- Ensure uploads can be resumed automatically if interrupted (e.g., due to network issues).
- Handle potential upload errors gracefully and inform the user.
- Integrate seamlessly with the existing backend processing queue for initial file validation and Git commits.
- Support uploading files into the context of a specific project (and potentially folder, as per user notes).

## 3. Non-Goals

- Real-time collaborative editing of uploaded files (this is a separate feature).
- Advanced file transformation, conversion, virus scanning, or metadata extraction during the initial upload/processing phase (these are deferred to the roadmap).

## 4. Proposed Solution: Tus Protocol + Uppy Library

To achieve resumability and robust progress tracking, we will adopt the **Tus open protocol** for resumable file uploads.

### 4.1 Frontend Implementation (Client-Side)

- **Library:** We will integrate the **Uppy** file upload library ([https://uppy.io/](https://uppy.io/)). Uppy provides:
    - A robust UI toolkit (Dashboard modal or inline components) for file selection, previews, and progress display.
    - Plugin architecture, including `@uppy/tus` for handling the Tus protocol.
    - Support for multiple file sources (initially focusing on local disk).
    - Event listeners for progress, success, and error handling.

- **Integration:**
    - Integrate Uppy's UI components (e.g., `<Dashboard />` or `<DragDrop />` + `<StatusBar />`) into the designated file upload section on the dashboard (see Section 5).
    - Configure the `@uppy/tus` plugin to point to our new backend Tus endpoint (see 4.2).
    - Pass necessary metadata along with the upload request (using Uppy's `meta` fields), specifically the `projectId`, `userId` (obtained from request context/session), and potentially `targetFolderPath`.
    - Handle Uppy's `upload-success` event. This signifies the *transfer* to the server is complete. The UI should indicate this phase is done, but final confirmation of processing/Git commit needs a separate mechanism (see Section 7).
    - Handle Uppy's `upload-error` event to display user-friendly error messages related to the transfer process.

### 4.2 Backend Implementation (Server-Side)

- **Protocol Implementation:** Implement a Tus-compliant server endpoint using the `tus-node-server` library ([https://github.com/tus/tus-node-server](https://github.com/tus/tus-node-server)) integrated within a dedicated Next.js API route handler (e.g., `/api/upload/tus`).

- **Endpoint Logic (`/api/upload/tus`):**
    - Configure `tus-node-server` to handle the Tus protocol lifecycle events:
        - `EVENT_UPLOAD_CREATED`: Triggered on initial POST. Server stores upload metadata (original filename, size, `projectId`, `userId`, `targetFolderPath` from client meta and request context) associated with a generated unique upload ID. Uses the `FileStore` datastore (see 4.2.1) for persistence.
        - `EVENT_CHUNK_UPLOADED`: Triggered on successful PATCH. Server verifies offset, appends chunk to a temporary file associated with the upload ID, updates stored offset.
        - `EVENT_UPLOAD_COMPLETE`: Triggered when the final chunk arrives.
            1. Assemble the complete file from chunks in temporary storage.
            2. Generate a unique filename (e.g., using `randomUUID()`).
            3. Create a structured temporary path: `./temp_uploads/YYYY-MM-DD/<userId>/` (where YYYY-MM-DD is the current date).
            4. Move the assembled file to this path using the generated UUID filename (e.g., `./temp_uploads/2024-07-29/1/a1b2c3d4-e5f6-7890-abcd-ef0123456789.tmp`).
            5. **Enqueue `PROCESS_UPLOADED_ASSET` background task:** Create a task payload object containing:
                - `tempFilePath`: The full path to the uploaded file in the temp directory.
                - `originalFilename`: The original name of the file uploaded by the user.
                - `projectId`: The target project ID.
                - `userId`: The ID of the user who uploaded the file.
                - `targetFolderPath`: (Optional) The target folder within the project.
                - `uploadTimestamp`: The time the upload was completed.
                - `fileSize`: The size of the uploaded file.
                - `mimeType`: (Optional, if detectable) The MIME type of the file.
            6. Clean up temporary chunk files associated with the completed upload.

### 4.2.1 Storage & Datastore

- **Datastore (for Tus State):** `tus-node-server` requires a datastore to manage upload state (metadata, offsets) for resumability. We will use the **`FileStore`** provided by `tus-node-server`, which uses the local filesystem. This is suitable for initial development and single-instance deployments.
- **Temporary Chunk Storage:** Configure `tus-node-server` with a base `path` for storing temporary *chunks* during upload (e.g., `./temp_uploads/chunks` or a persistent volume). These are temporary and distinct from the final assembled file location.
- **Temporary Upload Directory (for Completed Files):** Use a dedicated directory (e.g., `./temp_uploads/completed`) structured as described in 4.2 (`YYYY-MM-DD/<userId>/<uuid_filename>`) for storing the fully assembled files before they are processed by the background task. Ensure appropriate permissions and cleanup policies.

### 4.3 Background Processing (Initial Workflow)

- The `PROCESS_UPLOADED_ASSET` task, enqueued upon `EVENT_UPLOAD_COMPLETE`, triggers the `processUploadedAssetHandler`.
- This handler will execute the **initial workflow** using the metadata provided in the task payload:
    1.  **Validation:**
        *   Check file format/type against permitted list (if defined).
        *   Check file size against project/system limits.
    2.  **ACL/Quota Check:**
        *   Verify user has permission to upload to the specified project/folder.
        *   Check if the upload exceeds user/project storage quotas.
    3.  **Move to Git:** Move the validated file from the temporary upload directory to the correct location within the project's Git filesystem (using `originalFilename` or a sanitized version).
    4.  **Git Commit:** Commit the new file (and potentially an updated `manifest.json` file tracking project assets) to the Git repository.
    5.  **Signal Completion:** Emit a WebSocket event indicating success or failure (with details) of the entire process.

- **Error Handling:** If any step fails (Validation, ACL/Quota, Move, Commit), the handler should stop, potentially log the error, move the temporary file to an error/quarantine location, and emit a failure WebSocket event.

## 5. UI/UX Considerations

- **Component Placement:** The primary upload interface (using Uppy) will be placed within the dedicated **file upload section on the main dashboard**. Future iterations may include adding drag-and-drop functionality directly onto the project tree view for more contextual uploads (See Roadmap).
- **Progress Display:** Utilize Uppy's built-in progress bars for the file transfer. Clearly distinguish between "uploading" (transfer progress) and "processing" (waiting for background task completion).
- **Status Indication:** After transfer completes, show a "Processing..." status until the background task finishes. Use the **WebSocket-based notification system** (see Section 7) to inform the user of final success or failure.
- **Error Handling:** Display Uppy errors for transfer issues. Use the notification system for errors occurring during background processing (validation, quota, Git commit, etc.).
- **Cancellation:** Implement cancellation via Uppy's API. This should trigger a request to the Tus server to delete the upload resource and clean up chunks/temporary files.

## 6. Data Flow Summary

1.  User selects file(s) via Uppy UI in the dashboard upload section.
2.  Uppy (`@uppy/tus`) sends POST to `/api/upload/tus` with metadata (`projectId`, etc.).
3.  Tus server creates upload resource (storing state in `FileStore`), returns unique upload URL.
4.  Client sends chunks (PATCH) to upload URL. Server saves chunks, updates offset in `FileStore`.
5.  (If interrupted) Client sends HEAD to get offset, resumes PATCH requests.
6.  Upon final PATCH, Tus server triggers `EVENT_UPLOAD_COMPLETE`.
7.  Server assembles file, moves it to structured temp dir (`./temp_uploads/completed/YYYY-MM-DD/...`), enqueues `PROCESS_UPLOADED_ASSET` task (with rich metadata object), cleans chunks.
8.  Background worker picks up task and executes the initial workflow (validate format/size/quota, move, commit).
9.  Background worker signals completion/failure via **WebSocket event**.
10. Frontend (listening via WebSocket) receives signal and updates UI to show final status (e.g., in Notifications Panel or upload UI).

## 7. Potential Challenges & Considerations

- **FileStore Limitations:** `FileStore` might not be suitable for multi-server/serverless deployments. Scaling would require migrating to a shared datastore (see Roadmap).
- **Storage Cleanup:** Implement robust cleanup for abandoned Tus uploads (stale `.info` files in `FileStore` and corresponding chunks) *and* successfully processed files in the temporary completed directory.
- **Authentication/Authorization:** Ensure the Tus endpoint is secured. Use hooks (like `onUploadCreate` or middleware) to verify user permissions based on `projectId` and `userId`.
- **Frontend State Complexity:** Managing the state for multiple files (uploading, processing, success, error) requires careful state management in the React component.
- **Generalized WebSocket Implementation:** Implementing a robust WebSocket system suitable for various backend-to-frontend updates:
    - **File Upload Status:** Final completion/failure.
    - **Tree View Updates:** Triggered by background task completion (e.g., successful upload/commit) or external events (e.g., a Git hook detecting an `origin/main` change) to invalidate/refresh frontend caches or state.
    - **General Notifications:** Pushing notifications generated by various backend processes (task queue execution, system events, etc.) to the Notifications Panel.

## Appendix: Roadmap

Potential future enhancements and deferred features:

- **Advanced Background Processing:**
    - Virus/malware scanning.
    - Content policy violation checks.
    - Metadata extraction (e.g., EXIF from images).
    - File conversions (e.g., Markdown to HTML).
- **Scalable Tus Datastore:** Migrate from `FileStore` to `RedisStore` or similar for multi-instance deployments.
- **Enhanced Upload Sources:** Support for other upload sources (e.g., Google Drive, Dropbox via Uppy plugins).
- **Early Server-Side Validation:** Implement validation *during* upload (e.g., checking file type/size limits early via Tus hooks) to fail faster.
- **Granular Background Progress:** Displaying more granular progress from the background processing steps via WebSockets.
- **Contextual Upload UI:** Implementing drag-and-drop uploads directly onto the `ProjectTreeView` component.
