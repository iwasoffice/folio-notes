package com.iwasoffice.folionotes;

import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import org.json.JSONObject;

import java.util.concurrent.Executor;

public class MainActivity extends FragmentActivity {
    private WebView webView;
    private BiometricPrompt biometricPrompt;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(isSystemDarkMode() ? Color.rgb(22, 20, 17) : Color.rgb(243, 236, 226));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        webView.addJavascriptInterface(new AndroidThemeBridge(), "AndroidTheme");
        webView.addJavascriptInterface(new AndroidSecurityBridge(), "AndroidSecurity");
        webView.setWebViewClient(new WebViewClient());

        setupBiometricPrompt();
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    private boolean isSystemDarkMode() {
        int nightMode = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return nightMode == Configuration.UI_MODE_NIGHT_YES;
    }

    private boolean isBiometricAvailable() {
        int authenticators =
            BiometricManager.Authenticators.BIOMETRIC_STRONG |
            BiometricManager.Authenticators.BIOMETRIC_WEAK;

        return BiometricManager.from(this).canAuthenticate(authenticators)
            == BiometricManager.BIOMETRIC_SUCCESS;
    }

    private void setupBiometricPrompt() {
        Executor executor = ContextCompat.getMainExecutor(this);
        biometricPrompt = new BiometricPrompt(
            this,
            executor,
            new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(
                    @NonNull BiometricPrompt.AuthenticationResult result
                ) {
                    super.onAuthenticationSucceeded(result);
                    sendBiometricResult(true, "");
                }

                @Override
                public void onAuthenticationError(
                    int errorCode,
                    @NonNull CharSequence errString
                ) {
                    super.onAuthenticationError(errorCode, errString);

                    if (
                        errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON ||
                        errorCode == BiometricPrompt.ERROR_USER_CANCELED ||
                        errorCode == BiometricPrompt.ERROR_CANCELED
                    ) {
                        return;
                    }

                    sendBiometricResult(false, "Fingerprint authentication was not completed.");
                }
            }
        );
    }

    private void showBiometricPrompt() {
        if (!isBiometricAvailable()) {
            sendBiometricResult(false, "Fingerprint unlock is unavailable on this device.");
            return;
        }

        int authenticators =
            BiometricManager.Authenticators.BIOMETRIC_STRONG |
            BiometricManager.Authenticators.BIOMETRIC_WEAK;

        BiometricPrompt.PromptInfo promptInfo =
            new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Unlock Folio Notes")
                .setSubtitle("Use your fingerprint or device biometric")
                .setAllowedAuthenticators(authenticators)
                .setNegativeButtonText("Use PIN")
                .build();

        biometricPrompt.authenticate(promptInfo);
    }

    private void sendBiometricResult(boolean success, String message) {
        if (webView == null) return;

        String safeMessage = JSONObject.quote(message == null ? "" : message);
        String script =
            "window.dispatchEvent(new CustomEvent('folio-biometric-result'," +
            "{detail:{success:" + success + ",message:" + safeMessage + "}}));";

        webView.evaluateJavascript(script, null);
    }

    private class AndroidThemeBridge {
        @JavascriptInterface
        public boolean isDarkMode() {
            return isSystemDarkMode();
        }
    }

    private class AndroidSecurityBridge {
        @JavascriptInterface
        public boolean isBiometricAvailable() {
            return MainActivity.this.isBiometricAvailable();
        }

        @JavascriptInterface
        public void authenticateBiometric() {
            runOnUiThread(() -> showBiometricPrompt());
        }
    }

    @Override
    protected void onResume() {
        super.onResume();

        if (webView != null) {
            webView.setBackgroundColor(
                isSystemDarkMode()
                    ? Color.rgb(22, 20, 17)
                    : Color.rgb(243, 236, 226)
            );

            webView.evaluateJavascript(
                "window.dispatchEvent(new Event('folio-system-theme-change'));",
                null
            );
        }
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            finish();
            return;
        }

        webView.evaluateJavascript(
            "Boolean(window.FolioHandleBack && window.FolioHandleBack())",
            result -> {
                if (!"true".equals(result)) {
                    finish();
                }
            }
        );
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
