package com.omnisize.app;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import android.os.ParcelFileDescriptor;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private JSONObject pendingFile = null;
    private ParcelFileDescriptor activeFileDescriptor = null;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public class AndroidBridgeInterface {
        @JavascriptInterface
        public String getPendingFile() {
            if (pendingFile != null) {
                String str = pendingFile.toString();
                pendingFile = null;
                return str;
            }
            return null;
        }

        @JavascriptInterface
        public void acknowledgePendingFile() {
            pendingFile = null;
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep all app content cleanly below the Android system status bar (clock, battery, camera cutout)
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (view, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars());
            view.setPadding(0, insets.top, 0, 0);
            return windowInsets;
        });

        // Register JavaScript interface for immediate reliable cold-start file retrieval
        mainHandler.post(() -> {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().addJavascriptInterface(new AndroidBridgeInterface(), "AndroidBridge");
            }
        });

        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_VIEW.equals(action) || Intent.ACTION_SEND.equals(action)) {
            Uri uri = null;
            if (Intent.ACTION_VIEW.equals(action)) {
                uri = intent.getData();
            } else if (Intent.ACTION_SEND.equals(action)) {
                uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            }
            if (uri != null) {
                processFileUri(uri, intent.getType());
            }
        }
    }

    private void processFileUri(Uri uri, String initialMimeType) {
        new Thread(() -> {
            try {
                String fileName = "file";
                String resolvedMimeType = initialMimeType;
                if ("content".equalsIgnoreCase(uri.getScheme())) {
                    try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
                        if (cursor != null && cursor.moveToFirst()) {
                            int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                            if (nameIndex != -1) {
                                fileName = cursor.getString(nameIndex);
                            }
                        }
                    } catch (Exception ignored) {}
                }
                if (fileName == null || fileName.equals("file")) {
                    String path = uri.getLastPathSegment();
                    if (path != null) {
                        fileName = path.substring(path.lastIndexOf('/') + 1);
                    }
                }
                if (resolvedMimeType == null || resolvedMimeType.isEmpty() || resolvedMimeType.equals("*/*")) {
                    resolvedMimeType = getContentResolver().getType(uri);
                    if (resolvedMimeType == null) {
                        String lowerName = fileName.toLowerCase();
                        if (lowerName.endsWith(".pdf")) resolvedMimeType = "application/pdf";
                        else if (lowerName.endsWith(".png")) resolvedMimeType = "image/png";
                        else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) resolvedMimeType = "image/jpeg";
                        else if (lowerName.endsWith(".mp4")) resolvedMimeType = "video/mp4";
                        else if (lowerName.endsWith(".mkv")) resolvedMimeType = "video/x-matroska";
                        else if (lowerName.endsWith(".webm")) resolvedMimeType = "video/webm";
                    }
                }

                try {
                    if (activeFileDescriptor != null) {
                        try { activeFileDescriptor.close(); } catch (Exception ignored) {}
                        activeFileDescriptor = null;
                    }
                    activeFileDescriptor = getContentResolver().openFileDescriptor(uri, "r");
                } catch (Exception ignored) {}

                try (InputStream is = getContentResolver().openInputStream(uri)) {
                    if (is != null) {
                        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                        byte[] data = new byte[16384];
                        int nRead;
                        while ((nRead = is.read(data, 0, data.length)) != -1) {
                            buffer.write(data, 0, nRead);
                        }
                        byte[] fileBytes = buffer.toByteArray();
                        String base64 = Base64.encodeToString(fileBytes, Base64.NO_WRAP);

                        JSONObject json = new JSONObject();
                        json.put("name", fileName);
                        json.put("mimeType", resolvedMimeType != null ? resolvedMimeType : "application/octet-stream");
                        json.put("base64", base64);
                        json.put("size", fileBytes.length);

                        mainHandler.post(() -> deliverFileToWebview(json));
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }

    @Override
    public void onDestroy() {
        if (activeFileDescriptor != null) {
            try { activeFileDescriptor.close(); } catch (Exception ignored) {}
            activeFileDescriptor = null;
        }
        super.onDestroy();
    }

    private void deliverFileToWebview(JSONObject json) {
        pendingFile = json;
        dispatchPendingFile();
    }

    private void dispatchPendingFile() {
        if (pendingFile == null) return;
        final String fileJsonStr = pendingFile.toString();

        final Runnable attemptDeliver = new Runnable() {
            private int attempts = 0;

            @Override
            public void run() {
                attempts++;
                if (pendingFile == null) return;

                if (bridge != null && bridge.getWebView() != null) {
                    String script = "(function() {" +
                        "  var data = " + fileJsonStr + ";" +
                        "  window.__omnisize_pending_file = data;" +
                        "  if (typeof window.handleExternalAndroidFile === 'function') {" +
                        "    window.handleExternalAndroidFile(data);" +
                        "    return 'handled';" +
                        "  }" +
                        "  return 'queued';" +
                        "})();";
                    bridge.getWebView().evaluateJavascript(script, (result) -> {
                        if (result != null && result.contains("handled")) {
                            pendingFile = null;
                        } else if (attempts < 25) {
                            mainHandler.postDelayed(this, 350);
                        }
                    });
                } else if (attempts < 25) {
                    mainHandler.postDelayed(this, 350);
                }
            }
        };

        mainHandler.post(attemptDeliver);
    }
}
