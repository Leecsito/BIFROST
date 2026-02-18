package com.example.pruebaproyecto1;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class Bienvenida extends AppCompatActivity {

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_bienvenida);

        webView = findViewById(R.id.webview_welcome);

        // Configuración Web
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);

        // --- SOLUCIÓN PARA QUE NO GUARDE LA PÁGINA VIEJA ---
        webSettings.setCacheMode(WebSettings.LOAD_NO_CACHE); // Obliga a cargar de internet
        webView.clearCache(true); // Borra rastros anteriores
        // ---------------------------------------------------

        // INTERCEPTOR DE URL
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Si la web intenta ir a la carpeta "inicio", saltamos al MainActivity nativo
                if (url.contains("/inicio/")) {
                    irAMainActivity();
                    return true;
                }
                return false;
            }
        });

        // Cargamos la bienvenida
        webView.loadUrl("https://bifrost.free.nf/");

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });
    }

    private void irAMainActivity() {
        Intent intent = new Intent(Bienvenida.this, MainActivity.class);
        startActivity(intent);
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
        finish(); // Cerramos Bienvenida
    }
}